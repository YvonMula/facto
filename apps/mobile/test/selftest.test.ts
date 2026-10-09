import { createNodeBackend } from '@facto/crypto/node';
import { describe, expect, it } from 'vitest';
import { formatResult, runSelfTest, summarise } from '../src/selftest/run';
import { FakeDbFiles, FakeKeyStore } from './fakes';

function deps(files = new FakeDbFiles([])) {
  return createNodeBackend().then((backend) => ({
    backend,
    keyStore: new FakeKeyStore(),
    files: Object.assign(files, {
      async openWithoutKey() {
        if (files.key !== null) throw new Error('file is not a database');
        return files.open(new Uint8Array(32));
      },
    }),
    now: () => performance.now(),
  }));
}

describe('device self-test harness', () => {
  it('passes every check against correct implementations', async () => {
    const r = await runSelfTest(await deps());
    expect(r.checks.filter((c) => !c.ok)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.checks.map((c) => c.name)).toEqual(['vectors', 'sqlcipher', 'db-delete', 'keystore-delete', 'argon2id', 'pin-counter', 'recovery']);
    expect(typeof r.argon2idMs).toBe('number');
  });

  it('fails the sqlcipher check when the database opens without its key', async () => {
    const d = await deps();
    d.files.openWithoutKey = async () => d.files.open(new Uint8Array(32)).catch(() => ({ execute: async () => ({ rows: [] }), close() {} }));
    const r = await runSelfTest(d);
    expect(r.checks.find((c) => c.name === 'sqlcipher')?.ok).toBe(false);
    expect(r.ok).toBe(false);
  });

  it('fails the keystore check when deletion does not delete', async () => {
    const d = await deps();
    d.keyStore.stuck.add('selftest.probe.v1');
    const r = await runSelfTest(d);
    expect(r.checks.find((c) => c.name === 'keystore-delete')?.ok).toBe(false);
  });

  it('logs one marker line with no secret material', async () => {
    const line = formatResult(await runSelfTest(await deps()));
    expect(line.startsWith('FACTO_SELFTEST {')).toBe(true);
    expect(line).not.toMatch(/[0-9a-f]{64}/);
  });
});

describe('self-test screen summary', () => {
  it('counts failures and keeps details and timing', () => {
    const s = summarise({ ok: false, checks: [{ name: 'a', ok: true }, { name: 'b', ok: false, detail: 'x' }], argon2idMs: 812 });
    expect(s).toEqual({ ok: false, failed: 1, lines: [{ name: 'a', ok: true, detail: undefined }, { name: 'b', ok: false, detail: 'x' }], argon2idMs: 812 });
  });
});
