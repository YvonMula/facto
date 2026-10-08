/**
 * Replay protection for envelopes (PRD 5.8): message IDs are kept until their expiry day,
 * and a repeated ID is dropped. The intake service backs this with its database.
 */
export interface ReplayCache {
  /** Returns true the first time an ID is seen, false for a repeat. */
  remember(messageId: string, expiryDay: number): boolean;
  /** Forgets IDs whose expiry day is before `today`. */
  purge(today: number): void;
}

export class InMemoryReplayCache implements ReplayCache {
  private readonly seen = new Map<string, number>();

  remember(messageId: string, expiryDay: number): boolean {
    if (this.seen.has(messageId)) return false;
    this.seen.set(messageId, expiryDay);
    return true;
  }

  purge(today: number): void {
    for (const [id, exp] of this.seen) if (exp < today) this.seen.delete(id);
  }

  get size(): number {
    return this.seen.size;
  }
}
