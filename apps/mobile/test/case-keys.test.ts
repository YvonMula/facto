import { createNodeBackend } from '@facto/crypto/node';
import { deriveCaseAuthorKey, caseAuthorKeyFromRoot, toHex, type SodiumBackend } from '@facto/crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { migrate } from '../src/secure/app-db';
import { caseRootFor, recoveryCodeForCase, restoreFromCode } from '../src/secure/case-keys';
import { panicWipe } from '../src/secure/panic';
import { Vault } from '../src/secure/vault';
import { FakeDbFiles, FakeKeyStore } from './fakes';

const CASE = '3f0b8c2e-1d4a-4b6f-9a7c-2e5d8f1a0b3c';
let b: SodiumBackend;
beforeAll(async () => {
  b = await createNodeBackend();
});

async function phone() {
  const store = new FakeKeyStore();
  const files = new FakeDbFiles(store.log);
  const vault = new Vault(b, store);
  const db = await files.open(await vault.create());
  await migrate(db);
  return { store, files, vault, db };
}

describe('case keys and recovery on the phone (PRD 4.7)', () => {
  it('a code shown on one phone restores the same author key on another', async () => {
    const a = await phone();
    const code = await recoveryCodeForCase(b, a.vault, a.db, CASE);
    const secretA = (await a.vault.deviceSecret())!;

    const c = await phone();
    expect(await restoreFromCode(b, c.db, code)).toEqual({ ok: true, caseId: CASE });
    const root = await caseRootFor(b, c.vault, c.db, CASE);
    expect(toHex(caseAuthorKeyFromRoot(b, root).publicKey)).toBe(toHex(deriveCaseAuthorKey(b, secretA, CASE).publicKey));
  });

  it('without a restored root, the case root comes from this phone\'s device secret', async () => {
    const p = await phone();
    const secret = (await p.vault.deviceSecret())!;
    const root = await caseRootFor(b, p.vault, p.db, CASE);
    expect(toHex(caseAuthorKeyFromRoot(b, root).publicKey)).toBe(toHex(deriveCaseAuthorKey(b, secret, CASE).publicKey));
  });

  it('refuses a mistyped code and stores nothing', async () => {
    const p = await phone();
    const code = await recoveryCodeForCase(b, p.vault, p.db, CASE);
    const typo = (code[0] === '0' ? '1' : '0') + code.slice(1);
    const other = await phone();
    const r = await restoreFromCode(b, other.db, typo);
    expect(r.ok).toBe(false);
    expect(other.files.rows.size).toBe(0);
  });

  it('restored roots are erased by the panic wipe', async () => {
    const a = await phone();
    const code = await recoveryCodeForCase(b, a.vault, a.db, CASE);
    const c = await phone();
    await restoreFromCode(b, c.db, code);
    expect(c.files.rows.size).toBe(1);
    await panicWipe(c.vault, c.db, c.files);
    expect(c.files.rows.size).toBe(0);
  });
});
