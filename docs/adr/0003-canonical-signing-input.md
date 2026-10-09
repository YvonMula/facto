# ADR 0003: Canonical binary signing input

- Status: Accepted (owner, 2026-10-08)
- Date: 2026-10-08
- PRD sections: 5.2, 5.3, 7.1

## Context

Cases, comments and moderation events are signed on one side (phone or moderator browser) and verified on others (server, every reader). If the two sides serialise the same payload into different bytes, valid content fails verification, or worse, two different payloads could share bytes. JSON is not canonical by default (key order, number formats, Unicode escapes).

## Decision

The bytes that are signed are a length-prefixed binary record:

```
"facto-sig" 0x00
u8   format version (currently 1)
u16  length of purpose label, then the label in UTF-8   (for example "facto/case-author/v1")
u16  field count
for each field, in the order fixed by the payload's schema version:
  u32 length, then the field bytes
```

- All integers are big-endian. Strings are Unicode NFC (normalised on the phone, PRD 5.7), then UTF-8.
- Integers inside fields (time buckets) are encoded as decimal ASCII.
- An absent optional field (for example `parent_id` on a top-level comment) is encoded as a zero-length field, so position never shifts.
- Field order is defined once per payload type in `packages/schema` and covered by test vectors.

The purpose label inside the signed bytes means a signature made for one feature can never verify for another (PRD 7.1).

## Consequences

- One encoder in `packages/crypto` is shared by the app, the server and the dashboard.
- Payloads can still travel as JSON; only the signed bytes are canonical.
- Changing field order or adding a field needs a new format or payload version.
