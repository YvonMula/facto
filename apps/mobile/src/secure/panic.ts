import type { DbFiles, LocalDb } from './types';
import type { Vault } from './vault';

/**
 * Panic wipe (PRD 4.8, 7.2): keys first, then data, so an interrupted wipe still leaves the
 * database unreadable. Data files are deleted even if key deletion reports a failure;
 * the failure is rethrown afterwards so the caller can tell the user.
 */
export async function panicWipe(vault: Vault, db: LocalDb | null, files: DbFiles): Promise<void> {
  let keyError: unknown = null;
  try {
    await vault.wipeKeys();
  } catch (e) {
    keyError = e;
  }
  try {
    db?.close();
  } catch {
    // Already closed or never opened: nothing to do.
  }
  await files.deleteAll();
  if (keyError) throw keyError;
}
