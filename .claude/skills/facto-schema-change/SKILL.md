---
name: facto-schema-change
description: Use whenever Facto code creates or changes a database migration, table, query path, role, retention job or backup and restore logic.
---

# Facto schema changes

The database must stay safe to leak: a full dump should reveal nothing about who did what. The model is defined in `docs/PRD.md` sections 8.2, 6.3 and 11.

## Forbidden

- Tables named `users`, `devices`, `sessions`, `accounts` or anything that stands in for one.
- Columns holding IP addresses, user agents, device or install IDs, emails, phone numbers, GPS coordinates, or exact timestamps for content.
- Sequential or time-based public IDs. Use random UUIDv4 (`gen_random_uuid()`).
- Any join or column that links a vote, flag, comment identity or case author across cases.

## Required

1. **Plain SQL migrations** in `db/migrations` (main) or `db/issuer-migrations` (issuer). The issuer database never references content tables.
2. **Coarse time:** `created_hour` for cases and versions, `created_10min` for comments.
3. **Versioning:** content changes insert into `case_versions` or `comment_versions`; never `UPDATE` content in place.
4. **Append-only history:** `moderation_events` has `REVOKE UPDATE, DELETE` for every application role, and a trigger that sets `prev_hash` and `hash`. Test that UPDATE and DELETE fail.
5. **Published-only reads:** public endpoints read only through the published-only view or function. Add a test proving held, rejected, expired and removed rows never appear.
6. **Least-privilege roles:** separate roles for the API, workers and dashboard API, each granted only the tables and operations it needs.
7. **Retention:** every new table gets a row in the PRD section 11 retention schedule and a purge job in `services/workers`, in the same change. Ask the human if the retention period is unclear.
8. **Deletion ledger:** permanent deletions write a tombstone (ID and deletion date only) to the deletion ledger, which is replayed after any restore so deleted data never returns.
9. **Sealed hold queue:** unpublished content in `held_payloads` is stored only as ciphertext sealed to moderator keys.

## Before finishing

- Run the migration up on a fresh database and on a copy with existing data.
- Run the published-only, append-only and retention tests.
- Run `facto-security-review`.
- If a change needs anything on the forbidden list, stop and write an ADR in `docs/adr/` instead of the migration.
