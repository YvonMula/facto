import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GATES } from './index.js';

const root = resolve(process.env.FACTO_ROOT ?? resolve(fileURLToPath(import.meta.url), '../../../..'));
const only = process.argv.slice(2);
const selected = only.length ? GATES.filter((g) => only.includes(g.name)) : GATES;
if (only.length && selected.length !== only.length) {
  console.error(`Unknown gate. Available: ${GATES.map((g) => g.name).join(', ')}`);
  process.exit(2);
}

let failed = 0;
for (const gate of selected) {
  const violations = gate.run(root);
  if (violations.length === 0) {
    console.log(`PASS  ${gate.name}  ${gate.description}`);
    continue;
  }
  failed++;
  console.log(`FAIL  ${gate.name}  ${gate.description}`);
  for (const v of violations) console.log(`      ${v.file}${v.line ? `:${v.line}` : ''}  ${v.message}`);
}
console.log(failed ? `\n${failed} gate(s) failed.` : '\nAll gates passed.');
process.exit(failed ? 1 : 0);
