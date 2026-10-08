import { type Gate, listFiles, scanLines } from './lib.js';

/** PRD 1 claims policy; facto-security-review check 9. */
const PATTERNS = [
  { re: /100\s?%\s*anonym/i, message: 'claims "100% anonymous"' },
  { re: /untraceable/i, message: 'claims "untraceable"' },
  { re: /impossible to (track|trace)/i, message: 'claims "impossible to track"' },
  { re: /intra[çc]able/i, message: 'claims "intraçable"' },
  { re: /impossible [àa] (suivre|tracer|retracer)/i, message: 'claims "impossible à suivre"' },
  { re: /totally anonymous|completely anonymous|totalement anonyme|compl[èe]tement anonyme/i, message: 'claims total anonymity' },
  { re: /protect(s|ed)? you from (state )?surveillance|prot[èe]ge(r)? (contre|de) la surveillance/i, message: 'promises protection from surveillance' },
];

export const claims: Gate = {
  name: 'claims',
  description: 'No forbidden anonymity claims in shipped text (PRD 1)',
  run(root) {
    return scanLines(this.name, root, listFiles(root), PATTERNS);
  },
};
