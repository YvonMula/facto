import {
  fromBase64Url,
  generateDeviceSecret,
  generateLocalKey,
  isDuressPin,
  makeDuressVerifier,
  parseWrap,
  serialiseWrap,
  toBase64Url,
  unwrapKey,
  wrapKey,
  type SodiumBackend,
} from '@facto/crypto';
import type { KeyStore } from './types';

/** Names in the hardware-backed store. Every name here is erased by the panic wipe. */
export const KEY_NAMES = {
  deviceSecret: 'facto.device-secret.v1',
  /** Database key when no PIN is set (protected by the hardware store only). */
  dbKey: 'facto.db-key.v1',
  /** Database key wrapped under the PIN (PRD 7.2). */
  dbKeyWrap: 'facto.db-key-wrap.v1',
  /** Always present: real duress verifier or a dummy (PRD 4.8). */
  duress: 'facto.duress.v1',
  /** Consecutive wrong PINs (ADR 0009). */
  pinFailures: 'facto.pin-failures.v1',
} as const;

/** ADR 0009: the 3rd consecutive wrong PIN triggers a panic wipe. */
export const MAX_PIN_ATTEMPTS = 3;

export type VaultState = 'fresh' | 'no-pin' | 'pin';

export type UnlockResult = { kind: 'ok'; dbKey: Uint8Array } | { kind: 'duress' } | { kind: 'wrong' } | { kind: 'exhausted' };

export class KeyWipeError extends Error {}

export class Vault {
  constructor(
    private readonly b: SodiumBackend,
    private readonly store: KeyStore,
  ) {}

  async state(): Promise<VaultState> {
    if (!(await this.store.get(KEY_NAMES.deviceSecret))) return 'fresh';
    return (await this.store.get(KEY_NAMES.dbKeyWrap)) ? 'pin' : 'no-pin';
  }

  /** First launch (PRD 4.1 step 4): creates the device secret and database key. No network involved. */
  async create(): Promise<Uint8Array> {
    const secret = generateDeviceSecret(this.b);
    const dbKey = generateLocalKey(this.b);
    await this.store.set(KEY_NAMES.deviceSecret, toBase64Url(secret));
    await this.store.set(KEY_NAMES.dbKey, toBase64Url(dbKey));
    await this.store.set(KEY_NAMES.duress, serialiseWrap(makeDuressVerifier(this.b, null), toBase64Url));
    this.b.memzero(secret);
    return dbKey;
  }

  /** Database key when no PIN is set. */
  async openWithoutPin(): Promise<Uint8Array | null> {
    const raw = await this.store.get(KEY_NAMES.dbKey);
    return raw ? fromBase64Url(raw) : null;
  }

  /**
   * Checks the PIN against both the real wrap and the duress verifier, always computing both,
   * so the time taken does not reveal which one matched.
   *
   * ADR 0009: the failure counter is incremented and stored *before* the check, so killing the
   * app during the slow Argon2id step still spends the attempt. A missing or unreadable counter
   * counts as one attempt short of the limit, so deleting it cannot buy extra guesses.
   * Returns `exhausted` on the last wrong attempt; the caller must then wipe.
   */
  async unlock(pin: string): Promise<UnlockResult> {
    const stored = Number.parseInt((await this.store.get(KEY_NAMES.pinFailures)) ?? '', 10);
    const before = Number.isInteger(stored) && stored >= 0 && stored < MAX_PIN_ATTEMPTS ? stored : MAX_PIN_ATTEMPTS - 1;
    const attempt = before + 1;
    await this.store.set(KEY_NAMES.pinFailures, String(attempt));

    const wrapText = await this.store.get(KEY_NAMES.dbKeyWrap);
    const duressText = await this.store.get(KEY_NAMES.duress);
    const wrap = wrapText ? parseWrap(wrapText, fromBase64Url) : null;
    const duress = duressText ? parseWrap(duressText, fromBase64Url) : null;
    const key = wrap ? unwrapKey(this.b, wrap, pin) : null;
    const isDuress = duress ? isDuressPin(this.b, duress, pin) : false;
    if (key || isDuress) {
      await this.store.set(KEY_NAMES.pinFailures, '0');
      return key ? { kind: 'ok', dbKey: key } : { kind: 'duress' };
    }
    return attempt >= MAX_PIN_ATTEMPTS ? { kind: 'exhausted' } : { kind: 'wrong' };
  }

  /** Sets the app PIN and, optionally, a duress PIN. The unwrapped key is removed from the store. */
  async setPin(dbKey: Uint8Array, pin: string, duressPin: string | null): Promise<void> {
    if (duressPin !== null && duressPin === pin) throw new Error('duress PIN must differ from the app PIN');
    await this.store.set(KEY_NAMES.dbKeyWrap, serialiseWrap(wrapKey(this.b, dbKey, pin), toBase64Url));
    await this.store.set(KEY_NAMES.duress, serialiseWrap(makeDuressVerifier(this.b, duressPin), toBase64Url));
    await this.store.set(KEY_NAMES.pinFailures, '0');
    await this.store.delete(KEY_NAMES.dbKey);
  }

  async deviceSecret(): Promise<Uint8Array | null> {
    const raw = await this.store.get(KEY_NAMES.deviceSecret);
    return raw ? fromBase64Url(raw) : null;
  }

  /** Panic wipe step 1: destroy every key, then prove each one is gone. */
  async wipeKeys(): Promise<void> {
    const names = Object.values(KEY_NAMES);
    await Promise.allSettled(names.map((n) => this.store.delete(n)));
    for (const n of names) {
      if ((await this.store.get(n)) !== null) {
        // Retry once, then report: the caller still deletes data files.
        await this.store.delete(n);
        if ((await this.store.get(n)) !== null) throw new KeyWipeError(`key ${n} survived the wipe`);
      }
    }
  }
}
