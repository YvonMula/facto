import {
  decodeRecoveryCode,
  deriveCaseRoot,
  encodeRecoveryCode,
  fromBase64Url,
  toBase64Url,
  type RecoveryError,
  type SodiumBackend,
} from '@facto/crypto';
import { getRestoredRoot, putRestoredRoot } from './app-db';
import type { LocalDb } from './types';
import type { Vault } from './vault';

/**
 * The one place the app gets a case's root key (ADR 0008). A case restored from a recovery code
 * uses its stored root; any other case derives its root from this phone's device secret.
 * Posting and commenting (Phase 3) must go through here, never derive keys elsewhere.
 */
export async function caseRootFor(b: SodiumBackend, vault: Vault, db: LocalDb, caseId: string): Promise<Uint8Array> {
  const restored = await getRestoredRoot(db, caseId);
  if (restored) return fromBase64Url(restored);
  const secret = await vault.deviceSecret();
  if (!secret) throw new Error('no device secret');
  try {
    return deriveCaseRoot(b, secret, caseId);
  } finally {
    b.memzero(secret);
  }
}

/** The recovery code for one case, shown only on the user's request (PRD 4.7). */
export async function recoveryCodeForCase(b: SodiumBackend, vault: Vault, db: LocalDb, caseId: string): Promise<string> {
  const root = await caseRootFor(b, vault, db, caseId);
  try {
    return encodeRecoveryCode(b, caseId, root);
  } finally {
    b.memzero(root);
  }
}

/** Stores a case root from a recovery code. Returns the case ID, or why the code was refused. */
export async function restoreFromCode(
  b: SodiumBackend,
  db: LocalDb,
  code: string,
): Promise<{ ok: true; caseId: string } | { ok: false; error: RecoveryError }> {
  const r = decodeRecoveryCode(b, code);
  if (!r.ok) return r;
  try {
    await putRestoredRoot(db, r.caseId, toBase64Url(r.caseRoot));
  } finally {
    b.memzero(r.caseRoot);
  }
  return { ok: true, caseId: r.caseId };
}
