/**
 * Purpose label registry. Keep in sync with the table in
 * .claude/skills/facto-crypto-change/SKILL.md. Never reuse a label for a different purpose.
 */
export const LABELS = {
  /** Per-case root from device secret + case ID; the author and identity keys derive from it (ADR 0008). */
  caseRoot: 'facto/case-root/v1',
  /** Case author key from the case root (PRD 5.3, ADR 0008). */
  caseAuthor: 'facto/case-author/v1',
  /** Case-scoped commenter key from the case root (PRD 5.2, ADR 0008). */
  caseIdentity: 'facto/case-identity/v1',
  /** Vote nullifier from device secret + target ID (PRD 5.4). */
  vote: 'facto/vote/v1',
  /** Flag nullifier from device secret + target ID (PRD 4.6). */
  flag: 'facto/flag/v1',
  /** Local database key wrapping (PRD 7.2). */
  localDb: 'facto/local-db/v1',
  /** Per-case recovery code encoding (PRD 4.7). */
  caseRecovery: 'facto/case-recovery/v1',
  /** Signature over a case version (ADR 0003). */
  sigCase: 'facto/sig/case/v1',
  /** Signature over a case-scoped username claim (ADR 0003). */
  sigIdentityClaim: 'facto/sig/identity-claim/v1',
  /** Signature over a comment version (ADR 0003). */
  sigComment: 'facto/sig/comment/v1',
} as const;

export type Label = (typeof LABELS)[keyof typeof LABELS];
