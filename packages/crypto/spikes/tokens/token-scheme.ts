/**
 * Anonymous rate-limit tokens (PRD 5.4). SPIKE: not exported from @facto/crypto and not used by
 * any service until ADR 0006 is accepted and the external cryptographic review approves the
 * protocol (phase 1 gate).
 */
export type TokenPurpose = 'vote' | 'flag' | 'post' | 'comment';

/** Phone side: one in-flight blinded request. */
export interface PendingToken {
  /** Bytes sent to the issuer. The issuer cannot link them to the finalized token. */
  request: Uint8Array;
  /** Unblinds the issuer's response into a spendable token. */
  finalize(response: Uint8Array): Promise<Uint8Array>;
}

export interface TokenClient {
  createRequest(purpose: TokenPurpose): Promise<PendingToken>;
}

/** Issuer service side (separate service and database, PRD 8.1). */
export interface TokenIssuer {
  /** Signs a blinded request. Abuse checks (PRD 5.6) run before this call, never inside it. */
  issue(request: Uint8Array): Promise<Uint8Array>;
  publicKey(): Promise<Uint8Array>;
}

/** Intake side: checks a token and returns its double-spend key, or null if invalid. */
export interface TokenVerifier {
  verify(token: Uint8Array, purpose: TokenPurpose): Promise<{ spendKey: string } | null>;
}
