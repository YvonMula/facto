/**
 * Coarse time buckets (PRD 5.5, ADR 0001, CLAUDE.md invariant 10).
 * Values are Unix seconds at the start of the bucket. Exact times never leave this module.
 */
export const HOUR = 3600;
export const TEN_MINUTES = 600;
export const DAY = 86400;

export const hourBucket = (unixSeconds: number): number => Math.floor(unixSeconds / HOUR) * HOUR;
export const tenMinuteBucket = (unixSeconds: number): number => Math.floor(unixSeconds / TEN_MINUTES) * TEN_MINUTES;
/** Days since the Unix epoch; used for envelope expiry and spent-token days. */
export const dayNumber = (unixSeconds: number): number => Math.floor(unixSeconds / DAY);
