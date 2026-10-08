---
name: facto-security-review
description: Use before committing or merging any Facto change, when adding a dependency, or when asked to check code against Facto's security invariants, permissions or launch blockers.
---

# Facto security review

Facto's promise: its servers, database and operator hold nothing that identifies a poster, commenter or voter. This review checks a change against the invariants in `CLAUDE.md` and `docs/PRD.md` (sections 5, 7, 12). Any FAIL blocks the change.

Never make a check pass by weakening, skipping or deleting it. Fix the code, or stop and ask the human.

## 1. Scope the change

List the changed files (`git diff --name-only` against the base branch). Note which areas they touch: mobile app, dashboard, API, issuer, workers, crypto, schema, dependencies, translations.

## 2. Run the invariant checks

Search the changed files, and the whole package when a dependency or config changed. Report each check as PASS or FAIL with `file:line`.

| # | Invariant | How to check |
| --- | --- | --- |
| 1 | No location | Search for `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `NSLocation`, `expo-location`, `Geolocation`, `getCurrentPosition`, `watchPosition`. Any match = FAIL. |
| 2 | No identifiers stored or logged | Search the server code for `req.ip`, `request.ip`, `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`, `remoteAddress`, `user-agent`. Search the app for `getUniqueId`, `androidId`, `advertisingId`, `IDFA`, `installationId`, `expo-application`. Logging or storing any of them = FAIL. |
| 3 | No third-party telemetry | Search `package.json` files and imports for `firebase`, `@react-native-firebase`, `@sentry`, `amplitude`, `mixpanel`, `posthog`, `segment`, `onesignal`, `expo-notifications`, `expo-updates`, `expo-insights`, `google-analytics`. Any match = FAIL (self-hosted GlitchTip via an approved, scrubbed client is the only exception). |
| 4 | No account tables | Search migrations for tables named `users`, `devices`, `sessions`, `accounts`, and columns named `ip`, `user_agent`, `device_id`, `email`, `phone`, `lat`, `lng`, `latitude`, `longitude`. Any match = FAIL. |
| 5 | Secrets stay on the phone | No code path sends the device secret, private keys, seeds or recovery material over the network. Check every API client call that touches `packages/crypto`. |
| 6 | Sealed envelopes | Every write from the app goes through the envelope sealer in `packages/crypto`; no plaintext POST bodies for cases, comments, votes or flags. |
| 7 | Published-only reads | Every public read endpoint goes through the single published-only query path; a test covers held, rejected and removed content. |
| 8 | Coarse time | No exact timestamps stored for cases or comments (`created_hour`, `created_10min` only). |
| 9 | Claims policy | No user-facing text containing `100% anonymous`, `untraceable`, `impossible to track`, `100 % anonyme`, `intraçable`, or promises of protection from surveillance. |
| 10 | Translations | Every new user-facing string exists in both the French and English translation files. |

## 3. Permissions (mobile changes)

If `app.json`, `app.config.*`, Expo plugins or native modules changed: run the prebuild, then compare the generated `AndroidManifest.xml` and `Info.plist` with the permission matrix in PRD 7.2. Only the camera, microphone, limited photo picker and internet are allowed. `AD_ID` must be explicitly removed. Any extra permission = FAIL.

## 4. Dependency review (when a dependency is added or upgraded)

For each new direct dependency, and for any new transitive dependency with native code or network access:

1. Read its source or documentation for network calls, telemetry, analytics, crash reporting, device identifiers, location access and native permissions.
2. List its transitive dependencies and repeat for any that raise concerns.
3. Prefer the smallest maintained option; reject anything that phones home.
4. Add an entry to `DEPENDENCIES.md`: name, version, purpose, network activity (none or which hosts), permissions added, reviewer verdict, date.
5. If unsure, mark the entry `NEEDS-HUMAN-REVIEW` and do not merge.

## 5. Report

End with a short table: check, PASS or FAIL, evidence. If anything failed, list the fix you propose, and do not commit until it passes. If a check could not be run, say so; never report it as PASS.
