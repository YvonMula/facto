import { createReactNativeBackend, toHex, type ReactNativeSodium, type SodiumBackend } from '@facto/crypto';
import { isSQLCipher, open, type DB } from '@op-engineering/op-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Sodium from 'react-native-libsodium';
import type { DbFiles, KeyStore, LocalDb } from './types';

/**
 * Platform glue. Everything here needs a native build; it is covered by typecheck and prebuild
 * in CI, and must be exercised on a device before Phase 1 is closed (CLAUDE.md "Not verified yet").
 */
export const backend: SodiumBackend = createReactNativeBackend(Sodium as unknown as ReactNativeSodium);

const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  // Never synced to iCloud or restored to another device; readable only while unlocked.
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  requireAuthentication: false,
};

export const keyStore: KeyStore = {
  get: (name) => SecureStore.getItemAsync(name, STORE_OPTIONS),
  set: (name, value) => SecureStore.setItemAsync(name, value, STORE_OPTIONS),
  delete: (name) => SecureStore.deleteItemAsync(name, STORE_OPTIONS),
};

const DB_NAME = 'facto.db';

function wrap(db: DB): LocalDb {
  return {
    execute: async (sql, params = []) => {
      const res = await db.execute(sql, params);
      return { rows: (res.rows ?? []) as Record<string, unknown>[] };
    },
    close: () => db.close(),
  };
}

export const dbFiles: DbFiles = {
  async open(key) {
    // Fail closed: never write app data to a database built without SQLCipher.
    if (!isSQLCipher()) throw new Error('op-sqlite was built without SQLCipher');
    // SQLCipher raw-key form: the 32-byte key is used directly, with no passphrase KDF.
    const db = open({ name: DB_NAME, encryptionKey: `x'${toHex(key)}'` });
    // Reading the schema fails immediately if the key is wrong.
    await db.execute('SELECT count(*) FROM sqlite_master');
    return wrap(db);
  },
  async deleteAll() {
    // Deleting needs a handle but no key: SQLite does not read the file until a statement runs.
    const db = open({ name: DB_NAME });
    db.delete();
  },
};
