import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export const CI_OK = 'env:\n  EXPO_NO_TELEMETRY: 1\n';

/** Creates a throwaway repo tree for one gate test. */
export function makeRepo(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'facto-gate-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

export const pkg = (deps: Record<string, string> = {}, devDeps: Record<string, string> = {}) =>
  JSON.stringify({ name: 'x', dependencies: deps, devDependencies: devDeps });

export const depsTable = (...rows: [name: string, verdict: string][]) =>
  ['| Package | Version | Workspace | Purpose | Network activity | Permissions added | Verdict | Date |', '| --- | --- | --- | --- | --- | --- | --- | --- |']
    .concat(rows.map(([n, v]) => `| ${n} | 1 | x | x | None | None | ${v} | 2026-10-08 |`))
    .join('\n');
