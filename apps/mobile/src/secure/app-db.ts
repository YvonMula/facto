import type { LocalDb } from './types';

/** Local app state in the encrypted database. Grows with Phase 3 (drafts, saved posts, own cases). */
const MIGRATIONS = [
  'CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)',
  // Case roots restored from per-case recovery codes (PRD 4.7, ADR 0010). Erased with the database by the panic wipe.
  'CREATE TABLE IF NOT EXISTS restored_cases (case_id TEXT PRIMARY KEY NOT NULL, case_root TEXT NOT NULL)',
];

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

export async function getRestoredRoot(db: LocalDb, caseId: string): Promise<string | null> {
  const { rows } = await db.execute('SELECT case_root FROM restored_cases WHERE case_id = ?', [caseId]);
  const v = rows[0]?.case_root;
  return typeof v === 'string' ? v : null;
}

export async function putRestoredRoot(db: LocalDb, caseId: string, caseRoot: string): Promise<void> {
  await db.execute('INSERT INTO restored_cases (case_id, case_root) VALUES (?, ?) ON CONFLICT(case_id) DO UPDATE SET case_root = excluded.case_root', [caseId, caseRoot]);
}
