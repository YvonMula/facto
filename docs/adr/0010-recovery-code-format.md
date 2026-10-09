# ADR 0010: Per-case recovery code format

- Status: Accepted (owner chose grouped base32 text, 2026-10-09); NEEDS-CRYPTO-REVIEW
- Date: 2026-10-09
- PRD sections: 4.7; builds on ADR 0008

## Decision

```
payload  = 0x01 ‖ case_id (16 raw bytes) ‖ case_root (32 bytes)
checksum = first 4 bytes of HMAC-SHA256(key = "facto/case-recovery/v1", payload)
code     = Crockford base32(payload ‖ checksum)   → 85 characters, shown in groups of 4: "04ZG-Q31E-…"
```

- **Alphabet:** Crockford base32, with no I, L, O or U. Input ignores case, spaces and dashes, and reads I and L as 1 and O as 0. The unused padding bits must be zero, so each code has exactly one valid spelling.
- **Checksum:** detects typing mistakes. Tests show every single-character change and every swap of two neighbouring characters is rejected. It is **not** a security mechanism: the code is secret material in itself.
- **Scope:** the code restores one case's author key and username key (through the case root), and nothing else. It holds no device secret, so vote and flag credentials are never restored (PRD 4.7).
- **On the phone:** restored roots are stored in the SQLCipher database (`restored_cases`) and erased by the panic wipe. No copy-to-clipboard button is offered (PRD 7.2: nothing goes to the shared clipboard).

## Consequences

- Anyone holding a code can act as the author and commenter of that one case. The screen that shows a code warns about this.
- The code doesn't fit on one line of a small screen. People will write it down or photograph it. A QR display can be added later if the pilot shows a need.
- One vector (`recovery_codes`) is added to `test-vectors.json` and checked through both backends.
