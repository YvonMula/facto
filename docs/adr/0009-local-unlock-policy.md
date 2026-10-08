# ADR 0009: Local unlock policy (PIN attempts and wipe confirmation)

- Status: Accepted (owner, 2026-10-08)
- Date: 2026-10-08
- PRD sections: 4.8, 7.2 (the PRD is silent on attempt limits and on confirming the wipe)

## Decision

1. **Three attempts.** The 3rd consecutive wrong app PIN triggers the panic wipe (keys first, then data) and the app returns to first-launch state.
2. **No warning.** The lock screen only says "Wrong PIN" and never shows how many attempts are left, so someone forcing entry is not told that a wipe is coming.
3. **The counter cannot be dodged.** It lives in the Keystore/Keychain next to the wrapped key. It is incremented and stored *before* the Argon2id check, so killing the app during the check still spends the attempt. A missing or unreadable counter counts as one attempt short of the limit. A correct PIN or the duress PIN resets it. The panic wipe erases it.
4. **The duress PIN is not a failure.** It keeps its PRD 7.2 behaviour: wipe, then an empty normal-looking app.
5. **The long-press wipe asks first.** A native dialog offers "Cancel" (the default) and "Erase everything".

## Consequences

- A user who forgets their PIN loses everything on the phone after three tries. Per-case recovery codes (PRD 4.7) are the way back to their cases. The onboarding and PIN screens say so.
- Limit: an attacker who copies the phone's storage before trying can restore it and try again. Against that, the protection is the hardware-backed store plus Argon2id, not the counter.
- To verify on a device: the counter survives the app being killed during the check.
