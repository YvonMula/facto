import {
  decodeRecoveryCode,
  fromHex,
  generateDeviceSecret,
  generateLocalKey,
  InMemoryReplayCache,
  openEnvelope,
  recoveryCodeFor,
  toHex,
  unwrapKey,
  wrapKey,
  type SodiumBackend,
} from '@facto/crypto';
import vectors from '@facto/crypto/test-vectors.json';
import { computeDeterministicVectors } from '@facto/crypto/vectors';
import type { DbFiles, KeyStore, LocalDb } from '../secure/types';
import { Vault } from '../secure/vault';

/**
 * Device self-test (development builds with EXPO_PUBLIC_FACTO_SELFTEST=1 only).
 * Proves on a real runtime what Node tests cannot: Hermes + react-native-libsodium reproduce the
 * vectors, SQLCipher really encrypts, Keystore/Keychain deletion works, and Argon2id timing.
 * Uses its own database file and `selftest.`-prefixed key names, so it never touches app data.
 */
export interface SelfTestDeps {
  backend: SodiumBackend;
  keyStore: KeyStore;
  files: DbFiles & { openWithoutKey(): Promise<LocalDb> };
  now(): number;
}

export interface SelfTestResult {
  ok: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
  argon2idMs?: number;
}

const prefixed = (store: KeyStore, prefix: string): KeyStore => ({
  get: (n) => store.get(prefix + n),
  set: (n, v) => store.set(prefix + n, v),
  delete: (n) => store.delete(prefix + n),
});

async function rejects(p: Promise<unknown>): Promise<boolean> {
  try {
    await p;
    return false;
  } catch {
    return true;
  }
}

export async function runSelfTest(d: SelfTestDeps): Promise<SelfTestResult> {
  const checks: SelfTestResult['checks'] = [];
  const check = async (name: string, fn: () => Promise<boolean | string>) => {
    try {
      const r = await fn();
      checks.push(r === true ? { name, ok: true } : { name, ok: false, detail: typeof r === 'string' ? r : 'returned false' });
    } catch (e) {
      checks.push({ name, ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
  };
  const b = d.backend;
  let argon2idMs: number | undefined;

  await check('vectors', async () => {
    const fresh = computeDeterministicVectors(b);
    for (const k of ['keys', 'nullifiers', 'signatures', 'recovery_codes'] as const) {
      if (JSON.stringify(fresh[k]) !== JSON.stringify(vectors[k])) return `${k} differ`;
    }
    const m = vectors.rfc.hmac;
    if (toHex(b.hmacSha256(fromHex(m.key), fromHex(m.data))) !== m.mac) return 'hmac differs';
    const e = vectors.envelope;
    const out = openEnvelope(b, e.envelope, { publicKey: fromHex(e.intake_public_key), privateKey: fromHex(e.intake_private_key) }, { now: e.now, replay: new InMemoryReplayCache() });
    return toHex(out) === e.payload || 'envelope payload differs';
  });

  await check('sqlcipher', async () => {
    await d.files.deleteAll();
    const keyA = generateLocalKey(b);
    const keyB = generateLocalKey(b);
    const db = await d.files.open(keyA);
    await db.execute('CREATE TABLE t (v TEXT)');
    await db.execute('INSERT INTO t (v) VALUES (?)', ['facto']);
    db.close();
    const again = await d.files.open(keyA);
    const { rows } = await again.execute('SELECT v FROM t');
    again.close();
    if (rows[0]?.v !== 'facto') return 'row not read back with the right key';
    if (!(await rejects(d.files.open(keyB)))) return 'opened with the wrong key';
    if (!(await rejects(d.files.openWithoutKey()))) return 'opened without a key: file is not encrypted';
    return true;
  });

  await check('db-delete', async () => {
    await d.files.deleteAll();
    const db = await d.files.open(generateLocalKey(b));
    const { rows } = await db.execute("SELECT count(*) AS n FROM sqlite_master WHERE name = 't'");
    db.close();
    await d.files.deleteAll();
    return Number(rows[0]?.n ?? 0) === 0 || 'old table survived deletion';
  });

  await check('keystore-delete', async () => {
    const store = prefixed(d.keyStore, 'selftest.');
    await store.set('probe.v1', 'x');
    if ((await store.get('probe.v1')) !== 'x') return 'value not stored';
    await store.delete('probe.v1');
    return (await store.get('probe.v1')) === null || 'value survived deletion';
  });

  await check('argon2id', async () => {
    const key = generateLocalKey(b);
    const t0 = d.now();
    const w = wrapKey(b, key, '482913');
    argon2idMs = Math.round(d.now() - t0);
    const back = unwrapKey(b, w, '482913');
    return (back !== null && toHex(back) === toHex(key)) || 'unwrap failed';
  });

  await check('pin-counter', async () => {
    const store = prefixed(d.keyStore, 'selftest.');
    const v = new Vault(b, store);
    await v.setPin(await v.create(), '482913', null);
    await v.unlock('000001');
    const restarted = new Vault(b, store);
    await restarted.unlock('000002');
    const third = await new Vault(b, store).unlock('000003');
    await v.wipeKeys();
    return third.kind === 'exhausted' || `third attempt gave ${third.kind}`;
  });

  await check('recovery', async () => {
    const ds = generateDeviceSecret(b);
    const caseId = '3f0b8c2e-1d4a-4b6f-9a7c-2e5d8f1a0b3c';
    const r = decodeRecoveryCode(b, recoveryCodeFor(b, ds, caseId));
    return (r.ok && r.caseId === caseId) || 'round-trip failed';
  });

  return { ok: checks.every((c) => c.ok), checks, argon2idMs };
}

/** One logcat line CI looks for. Contains no secrets: only check names, results and a timing. */
export const SELFTEST_MARKER = 'FACTO_SELFTEST';
export const formatResult = (r: SelfTestResult) => `${SELFTEST_MARKER} ${JSON.stringify(r)}`;

/** What the self-test screen shows: one line per check, the failure count, and the Argon2id time. */
export function summarise(r: SelfTestResult): {
  ok: boolean;
  failed: number;
  lines: { name: string; ok: boolean; detail?: string }[];
  argon2idMs?: number;
} {
  return {
    ok: r.ok,
    failed: r.checks.filter((c) => !c.ok).length,
    lines: r.checks.map((c) => ({ name: c.name, ok: c.ok, detail: c.detail })),
    argon2idMs: r.argon2idMs,
  };
}
