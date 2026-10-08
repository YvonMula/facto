import type { DbFiles, KeyStore, LocalDb } from '../src/secure/types';

export class FakeKeyStore implements KeyStore {
  readonly data = new Map<string, string>();
  readonly log: string[] = [];
  /** Names whose deletion silently fails, to test the wipe check. */
  stuck = new Set<string>();
  async get(n: string) {
    return this.data.get(n) ?? null;
  }
  async set(n: string, v: string) {
    this.data.set(n, v);
  }
  async delete(n: string) {
    this.log.push(`key:delete:${n}`);
    if (!this.stuck.has(n)) this.data.delete(n);
  }
}

/** Database files that only open with the key they were created with, like SQLCipher. */
export class FakeDbFiles implements DbFiles {
  key: string | null = null;
  rows = new Map<string, string>();
  constructor(private readonly log: string[]) {}
  async open(key: Uint8Array): Promise<LocalDb> {
    const hex = Buffer.from(key).toString('hex');
    if (this.key === null) this.key = hex;
    if (this.key !== hex) throw new Error('file is not a database');
    const rows = this.rows;
    const log = this.log;
    return {
      async execute(sql, params = []) {
        if (sql.startsWith('INSERT')) rows.set(String(params[0]), String(params[1]));
        if (sql.startsWith('SELECT')) {
          const v = rows.get(String(params[0]));
          return { rows: v === undefined ? [] : [{ value: v }] };
        }
        return { rows: [] };
      },
      close() {
        log.push('db:close');
      },
    };
  }
  async deleteAll() {
    this.log.push('db:delete');
    this.key = null;
    this.rows.clear();
  }
}
