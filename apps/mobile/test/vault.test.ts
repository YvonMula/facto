import { createNodeBackend } from '@facto/crypto/node';
import type { SodiumBackend } from '@facto/crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { getState, migrate, setState } from '../src/secure/app-db';
import { panicWipe } from '../src/secure/panic';
import { KEY_NAMES, KeyWipeError, MAX_PIN_ATTEMPTS, Vault } from '../src/secure/vault';
import { FakeDbFiles, FakeKeyStore } from './fakes';

let b: SodiumBackend;
beforeAll(async () => {
  b = await createNodeBackend();
});

const setup = () => {
  const store = new FakeKeyStore();
  const files = new FakeDbFiles(store.log);
  return { store, files, vault: new Vault(b, store) };
};

describe('vault', () => {
  it('first launch creates the device secret, database key and a dummy duress verifier', async () => {
    const { store, vault } = setup();
    expect(await vault.state()).toBe('fresh');
    await vault.create();
    expect(await vault.state()).toBe('no-pin');
    expect(store.data.has(KEY_NAMES.duress)).toBe(true);
    expect((await vault.deviceSecret())?.length).toBe(32);
  });

  it('with a PIN, only the wrap is stored and unlock needs the right PIN', async () => {
    const { store, vault } = setup();
    const dbKey = await vault.create();
    await vault.setPin(dbKey, '482913', null);
    expect(await vault.state()).toBe('pin');
    expect(store.data.has(KEY_NAMES.dbKey)).toBe(false);
    const ok = await vault.unlock('482913');
    expect(ok.kind === 'ok' && Buffer.from(ok.dbKey).equals(Buffer.from(dbKey))).toBe(true);
    expect((await vault.unlock('000000')).kind).toBe('wrong');
  });

  it('recognises the duress PIN', async () => {
    const { vault } = setup();
    await vault.setPin(await vault.create(), '482913', '999111');
    expect((await vault.unlock('999111')).kind).toBe('duress');
  });

  it('refuses a duress PIN equal to the app PIN', async () => {
    const { vault } = setup();
    await expect(vault.setPin(await vault.create(), '482913', '482913')).rejects.toThrow();
  });

  it('stored data looks the same whether or not a duress PIN was set', async () => {
    const a = setup();
    await a.vault.setPin(await a.vault.create(), '482913', '999111');
    const c = setup();
    await c.vault.setPin(await c.vault.create(), '482913', null);
    expect([...a.store.data.keys()].sort()).toEqual([...c.store.data.keys()].sort());
    expect(a.store.data.get(KEY_NAMES.duress)!.length).toBe(c.store.data.get(KEY_NAMES.duress)!.length);
  });
});

describe('PIN attempt limit (ADR 0009)', () => {
  const withPin = async () => {
    const ctx = setup();
    await ctx.vault.setPin(await ctx.vault.create(), '482913', '999111');
    return ctx;
  };

  it('allows 3 attempts', () => {
    expect(MAX_PIN_ATTEMPTS).toBe(3);
  });

  it('the third consecutive wrong PIN is exhausted', async () => {
    const { vault } = await withPin();
    expect((await vault.unlock('000001')).kind).toBe('wrong');
    expect((await vault.unlock('000002')).kind).toBe('wrong');
    expect((await vault.unlock('000003')).kind).toBe('exhausted');
  });

  it('the right PIN after two wrong ones unlocks and resets the counter', async () => {
    const { store, vault } = await withPin();
    await vault.unlock('000001');
    await vault.unlock('000002');
    expect((await vault.unlock('482913')).kind).toBe('ok');
    expect(store.data.get(KEY_NAMES.pinFailures)).toBe('0');
    expect((await vault.unlock('000003')).kind).toBe('wrong');
  });

  it('the duress PIN after two wrong ones still counts as duress', async () => {
    const { vault } = await withPin();
    await vault.unlock('000001');
    await vault.unlock('000002');
    expect((await vault.unlock('999111')).kind).toBe('duress');
  });

  it('the counter survives an app restart', async () => {
    const { store, vault } = await withPin();
    await vault.unlock('000001');
    await vault.unlock('000002');
    const restarted = new Vault(b, store);
    expect((await restarted.unlock('000003')).kind).toBe('exhausted');
  });

  it('the attempt is recorded before the slow PIN check runs', async () => {
    const { store, vault } = await withPin();
    let seenDuringCheck: string | null = null;
    const realGet = store.get.bind(store);
    // The wrap is read after the counter is written and before Argon2id runs.
    store.get = async (n: string) => {
      if (n === KEY_NAMES.dbKeyWrap) seenDuringCheck = await realGet(KEY_NAMES.pinFailures);
      return realGet(n);
    };
    await vault.unlock('000001');
    expect(seenDuringCheck).toBe('1');
  });

  it('a deleted or corrupted counter gives no extra guesses', async () => {
    const { store, vault } = await withPin();
    store.data.delete(KEY_NAMES.pinFailures);
    expect((await vault.unlock('000001')).kind).toBe('exhausted');
    store.data.set(KEY_NAMES.pinFailures, 'garbage');
    expect((await vault.unlock('000002')).kind).toBe('exhausted');
  });

  it('exhaustion followed by the wipe leaves a fresh app', async () => {
    const { files, vault } = await withPin();
    for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) await vault.unlock(`00000${i}`);
    await panicWipe(vault, null, files);
    expect(await vault.state()).toBe('fresh');
  });

  it('the counter is erased by the wipe', async () => {
    const { store, vault } = await withPin();
    await vault.unlock('000001');
    await vault.wipeKeys();
    expect(store.data.has(KEY_NAMES.pinFailures)).toBe(false);
  });
});

describe('panic wipe (PRD 4.8, 7.2)', () => {
  it('destroys every key before touching data, then deletes the database', async () => {
    const { store, files, vault } = setup();
    const dbKey = await vault.create();
    const db = await files.open(dbKey);
    await migrate(db);
    await setState(db, 'onboarding', 'done');

    await panicWipe(vault, db, files);

    const firstData = store.log.findIndex((l) => l.startsWith('db:'));
    const lastKey = store.log.map((l) => l.startsWith('key:')).lastIndexOf(true);
    expect(lastKey).toBeLessThan(firstData);
    expect(store.data.size).toBe(0);
    expect(await vault.state()).toBe('fresh');
    expect(files.rows.size).toBe(0);
  });

  it('after the keys are gone, the old database cannot be opened even if file deletion never ran', async () => {
    const { files, vault } = setup();
    const dbKey = await vault.create();
    const db = await files.open(dbKey);
    await setState(db, 'secret-draft', 'x');
    await vault.wipeKeys();
    // Simulate a crash before file deletion: only a new key exists after relaunch.
    const newKey = await vault.create();
    await expect(files.open(newKey)).rejects.toThrow();
    expect(await vault.openWithoutPin()).not.toBeNull();
  });

  it('still deletes data when a key refuses to go, then reports the failure', async () => {
    const { store, files, vault } = setup();
    await vault.create();
    store.stuck.add(KEY_NAMES.deviceSecret);
    await expect(panicWipe(vault, null, files)).rejects.toBeInstanceOf(KeyWipeError);
    expect(store.log).toContain('db:delete');
  });

  it('a wiped app starts again as a first launch', async () => {
    const { files, vault } = setup();
    await vault.setPin(await vault.create(), '482913', '999111');
    await panicWipe(vault, null, files);
    expect(await vault.state()).toBe('fresh');
    expect((await vault.unlock('482913')).kind).not.toBe('ok');
  });
});

describe('app state store', () => {
  it('reads back what it wrote', async () => {
    const { files, vault } = setup();
    const db = await files.open(await vault.create());
    await migrate(db);
    expect(await getState(db, 'lang')).toBeNull();
    await setState(db, 'lang', 'fr');
    expect(await getState(db, 'lang')).toBe('fr');
  });
});
