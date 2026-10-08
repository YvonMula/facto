/**
 * Platform interfaces for local secrets and storage. The real implementations
 * (expo-secure-store, op-sqlite with SQLCipher) live in native.ts; tests use in-memory fakes.
 */

/** Hardware-backed key store (Android Keystore, iOS Keychain), this device only. */
export interface KeyStore {
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
  delete(name: string): Promise<void>;
}

export interface LocalDb {
  execute(sql: string, params?: (string | number | null)[]): Promise<{ rows: Record<string, unknown>[] }>;
  close(): void;
}

/** Opens the encrypted database, or removes its files without needing the key. */
export interface DbFiles {
  open(key: Uint8Array): Promise<LocalDb>;
  deleteAll(): Promise<void>;
}
