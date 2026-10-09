# ADR 0004: Monorepo toolchain

- Status: Accepted (owner, 2026-10-08)
- Date: 2026-10-08
- PRD sections: 7.5, 8.1

## Decision

- pnpm workspaces (CLAUDE.md), with `node-linker=hoisted` because Metro and Expo autolinking expect a flat `node_modules`.
- TypeScript strict everywhere, from `tsconfig.base.json`.
- Vitest for unit tests in packages, services and gates. It needs no telemetry and runs in Node.
- `tsx` runs the CI gate scripts directly from TypeScript.
- The CI gates live in `tools/gates` as a private workspace, `@facto/gates`, and each gate has fixture tests that prove it fails on a planted violation.
- Linting (ESLint) is deferred until feature code starts in Phase 2, so this ADR does not add it yet.

## Consequences

Every tool above is a dev dependency recorded in `DEPENDENCIES.md` as `APPROVED-DEV`, never shipped in an app or service build.
