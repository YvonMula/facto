import type { LocalDb } from './types';

/** Local app state in the encrypted database. Grows with Phase 3 (drafts, saved posts, own cases). */
const MIGRATIONS = ['CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)'];

export async function migrate(db: LocalDb): Promise<void> {
  for (const sql of MIGRATIONS) await db.execute(sql);
}

export async function getState(db: LocalDb, key: string): Promise<string | null> {
  const { rows } = await db.execute('SELECT value FROM app_state WHERE key = ?', [key]);
  const v = rows[0]?.value;
  return typeof v === 'string' ? v : null;
}

export async function setState(db: LocalDb, key: string, value: string): Promise<void> {
  await db.execute('INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}
