# ADR 0001: Signed payloads carry only coarse time

- Status: Accepted (approved by the project owner, 2026-10-08)
- Date: 2026-10-08
- PRD sections: 5.2, 5.5, 5.7; CLAUDE.md invariant 10

## Context

PRD 5.2 has the phone sign `{case_id, parent_id, body, timestamp}` for each comment. PRD 5.5 and invariant 10 say the server stores only the hour for cases and a 10-minute bucket for comments, and never the exact submission time.

A signature must be verifiable by every reader, so the signed fields must be stored and served. An exact timestamp inside the signed payload would therefore have to be stored, which breaks the coarse-time rule, and it would also give a timing correlation signal (PRD 5.7).

## Decision

Signed payloads never contain an exact time. They contain the coarse bucket the server will store:

- cases and case versions: `created_hour`, the UTC hour start, as an integer count of seconds since the Unix epoch, divisible by 3600;
- comments and comment versions: `created_10min`, the UTC start of the 10-minute bucket, divisible by 600.

The phone computes the bucket from its own clock when it signs. The intake service rejects a payload whose bucket is more than one bucket in the future, or older than the envelope TTL allows (offline queues are legitimate). The server never rewrites the bucket, because that would break the signature.

## Consequences

- PRD 5.2 table row "Comment" now reads: sign `{case_id, parent_id, body, created_10min}`.
- `packages/schema` enforces the divisibility rules, and tests reject non-bucketed values.
- Offline posts carry the bucket of when they were written, not when they were sent. This is intended: the envelope's random send jitter does not change the bucket.
