import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { type Gate, listPackages, read, type Violation } from './lib.js';

export const DEPENDENCIES_FILE = 'DEPENDENCIES.md';

interface Row {
  name: string;
  verdict: string;
}

/** Parses the table rows of DEPENDENCIES.md: | Package | Version | Workspace | Purpose | Network | Permissions | Verdict | Date | */
export function parseDependencies(text: string): Row[] {
  const rows: Row[] = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 8) continue;
    const [name, , , , , , verdict] = cells;
    if (!name || name === 'Package' || /^-+$/.test(name)) continue;
    rows.push({ name: name.replace(/`/g, ''), verdict: verdict ?? '' });
  }
  return rows;
}

export const depsReviewed: Gate = {
  name: 'deps-reviewed',
  description: 'Every direct dependency is reviewed in DEPENDENCIES.md (invariant 12)',
  run(root) {
    const out: Violation[] = [];
    if (!existsSync(join(root, DEPENDENCIES_FILE))) {
      return [{ gate: this.name, file: DEPENDENCIES_FILE, message: 'DEPENDENCIES.md missing' }];
    }
    const rows = parseDependencies(read(root, DEPENDENCIES_FILE));
    const verdicts = new Map<string, string[]>();
    for (const r of rows) verdicts.set(r.name, [...(verdicts.get(r.name) ?? []), r.verdict]);

    for (const r of rows) {
      if (r.verdict === 'NEEDS-HUMAN-REVIEW') out.push({ gate: this.name, file: DEPENDENCIES_FILE, message: `"${r.name}" is waiting for human review` });
    }

    for (const pkg of listPackages(root)) {
      const check = (dep: string, dev: boolean) => {
        if (dep.startsWith('@facto/')) return; // our own workspaces
        const v = verdicts.get(dep);
        if (!v) {
          out.push({ gate: this.name, file: pkg.file, message: `"${dep}" is not reviewed in DEPENDENCIES.md` });
        } else if (v.includes('REJECTED')) {
          out.push({ gate: this.name, file: pkg.file, message: `"${dep}" was rejected in DEPENDENCIES.md` });
        } else if (!dev && !v.includes('APPROVED')) {
          out.push({ gate: this.name, file: pkg.file, message: `"${dep}" is a runtime dependency but only approved for development` });
        } else if (dev && !v.includes('APPROVED') && !v.includes('APPROVED-DEV')) {
          out.push({ gate: this.name, file: pkg.file, message: `"${dep}" has no approved verdict` });
        }
      };
      Object.keys(pkg.dependencies).forEach((d) => check(d, false));
      Object.keys(pkg.devDependencies).forEach((d) => check(d, true));
    }
    return out;
  },
};
