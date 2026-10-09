import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { type Gate, listFiles, read, type Violation } from './lib.js';

export const LOCALES_DIR = 'apps/mobile/src/i18n/locales';
export const LANGUAGES = ['en', 'fr'] as const;

function flatten(obj: unknown, prefix = '', out = new Map<string, unknown>()): Map<string, unknown> {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.set(prefix, obj);
  }
  return out;
}

/** i18next plural suffixes share one base key. */
const baseKey = (k: string) => k.replace(/_(zero|one|two|few|many|other)$/, '');

export const i18n: Gate = {
  name: 'i18n',
  description: 'French and English translation files have the same keys, and every t() key exists (CLAUDE.md "Language and wording")',
  run(root) {
    const out: Violation[] = [];
    if (!existsSync(join(root, LOCALES_DIR))) return out; // no app yet
    const maps = new Map<string, Map<string, unknown>>();
    for (const lang of LANGUAGES) {
      const file = `${LOCALES_DIR}/${lang}.json`;
      if (!existsSync(join(root, file))) {
        out.push({ gate: this.name, file, message: `missing ${lang} translation file` });
        continue;
      }
      maps.set(lang, flatten(JSON.parse(read(root, file))));
    }
    for (const lang of LANGUAGES) {
      const mine = maps.get(lang);
      if (!mine) continue;
      const file = `${LOCALES_DIR}/${lang}.json`;
      for (const [k, v] of mine) {
        if (typeof v !== 'string' || v.trim() === '') out.push({ gate: this.name, file, message: `empty or non-string value for "${k}"` });
      }
      for (const other of LANGUAGES) {
        if (other === lang) continue;
        for (const k of maps.get(other)?.keys() ?? []) {
          if (!mine.has(k)) out.push({ gate: this.name, file, message: `missing key "${k}" (present in ${other}.json)` });
        }
      }
    }

    const en = maps.get('en');
    if (en) {
      const known = new Set([...en.keys()].map(baseKey));
      const sources = listFiles(root, ['apps']).filter((f) => /\.(ts|tsx)$/.test(f));
      for (const file of sources) {
        read(root, file).split('\n').forEach((line, i) => {
          for (const m of line.matchAll(/\bt\(\s*['"]([\w.-]+)['"]/g)) {
            const key = m[1] ?? '';
            if (!known.has(key)) out.push({ gate: this.name, file, line: i + 1, message: `t("${key}") has no translation` });
          }
        });
      }
    }
    return out;
  },
};
