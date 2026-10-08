# Facto — Product Requirements Document

Oct 7, 2026 · Facto team

## 1. Overview and vision

Facto is an anonymous community platform where people in the DRC share whistleblowing reports, community information and local news without ever creating an account or revealing who they are. It is a clean rebuild: the previous Firebase prototype is retired, and only the brand carries over.

The design rule behind every requirement: **Facto's server, database and operator must hold nothing that identifies a poster, commenter or voter, and must not create persistent identifiers that link a person to their activity.** This is an architectural property, not a guarantee of physical safety. Identity can still be inferred from content, behaviour, a compromised phone, network observation, coercion or information outside Facto (section 2).

**Five-year direction:** a privacy-preserving civic information network, starting in the DRC, built so other countries and partner organizations can be added without redesign.

### Locked product decisions

| # | Decision |
| --- | --- |
| 1 | Anonymous community-sharing platform (not a private tip line) |
| 2 | No conventional accounts: install, open, read, post |
| 3 | Usernames are optional and chosen per case when commenting |
| 4 | A username gives continuity inside one case only, never across cases |
| 5 | Upvote/downvote measures quality and usefulness |
| 6 | Votes are anonymous and unlinkable, protected by rate-limited anonymous tokens |
| 7 | Target content mix: 50% whistleblowing, 30% community information, 20% local news |
| 8 | Tiered publication: low-risk posts go live after automatic checks; high-risk posts go to a hold queue |
| 9 | The founder operates moderation alone at launch, anonymously; architecture supports a future team |
| 10 | Recovery is off by default; per-case recovery codes, with a full passphrase only as an advanced option |
| 11 | DRC first; geography modelled generically for later expansion |
| 12 | French and English at launch |
| 13 | UI follows the Behance reference layout, with Facto's own colors |
| 14 | Clean rebuild, no migration of old code or data |
| 15 | Self-hosted PostgreSQL with a custom API; no Supabase, no Firebase |
| 16 | Every write travels as a sealed, mesh-ready envelope; mesh relay itself is Phase 2 (Appendix A) |

### Verification rule and claims policy

> **If a security property cannot be verified by a test, audit, schema constraint, cryptographic proof or reproducible inspection, it is not yet a Facto requirement. It is only an intention.**

- Every security requirement in this document is written as an invariant with a matching check (section 7.7 and section 12).
- Product copy, store listings and the website must never describe Facto as “100% anonymous”, “untraceable” or “impossible to track”, and must never promise protection from state surveillance.
- Approved wording describes what Facto does not collect: “Facto does not ask for your name, phone number, email or location, and does not store your IP address.”
- Onboarding states the limits plainly (section 2, “What Facto cannot fully protect against”).

## 2. Threat model

Facto treats the server, the network and the operator as untrusted. The only trusted component is the user's own unlocked phone.

### Adversaries

| Adversary | Capabilities | Main goal |
| --- | --- | --- |
| State actors (police, intelligence, military) | Compel hosting providers and app stores, monitor mobile operators, seize phones at checkpoints, coerce the operator | Identify posters of damaging reports |
| Powerful local figures | Read posts, recognise local details, pressure people physically | Identify and retaliate against a specific poster |
| Armed groups | Same as local figures, plus violence | Silence or punish informants |
| Malicious users | Fake posts, vote manipulation, spam, doxxing, hate speech | Discredit people or manipulate the platform |
| Malicious or compromised infrastructure | Read all server data; serve altered responses, configuration or keys; target specific users; alter vote or moderation results | Unmask, track or deceive users |
| Facto's own operator | Full admin access | Must be technically unable to unmask users, even under pressure |

### Malicious infrastructure

Facto assumes its servers can be compromised or controlled by an adversary. The app therefore never treats server-provided code, configuration or cryptographic material as trusted by default.

| A malicious server could | Client defence |
| --- | --- |
| Push altered app code | No over-the-air code updates (`expo-updates` disabled); all code ships in signed store or APK builds |
| Serve altered configuration (limits, categories, lexicons) | Security-relevant settings are signed with an offline config key pinned in the app; unsigned config is ignored |
| Substitute keys (moderator, issuer) | Public keys pinned in the app binary or signed by the offline root key |
| Alter posts or comments | Every case and comment is signed by its author key; the app verifies before display and marks failures |
| Ask for secrets or extra data | The app never sends the device secret, recovery material or private keys, whatever the server requests |
| Serve a targeted fake feed or withhold content | **Not fully protected.** Mitigated by public transparency stats and cross-checks against the onion mirror |
| Observe request timing and token spending | **Partly protected.** Random delays, batching and optional Tor (section 5) |

The app binary itself must be trusted. Reproducible builds and a published signing fingerprint let independent reviewers confirm it matches the source.

### What Facto protects

- **Who posted, commented or voted.** No account, phone number, email, IP address or device identifier is stored.
- **Links between actions.** The server cannot tell that two posts, two cases' comments or two votes came from the same person.
- **Evidence metadata.** Photos and videos lose EXIF data, GPS tags and device fingerprints before upload.
- **Content on a seized phone.** Local data is encrypted, can be hidden behind a PIN, and can be wiped instantly.
- **The operator's identity.** The founder is not publicly linked to Facto.

### What Facto cannot fully protect against

These limits are shown to users in plain language during onboarding:

- **The content itself.** A detail only three people know can identify the poster. Automatic checks and the hold queue reduce this risk, but cannot eliminate it.
- **A phone that is already compromised** by spyware, or unlocked and inspected while the user is present.
- **Network-level observation of app use.** Without Tor, a mobile operator can see that a phone talks to Facto's servers, though not what it sends.
- **Self-linking.** A user who reuses the same username in every case links themselves socially.
- **A seized recovery passphrase,** which can link all cases recovered with it.

### Assumptions

- App distribution: Google Play, the Apple App Store, plus a signed APK on the website for users who cannot use stores.
- Users mainly have mid- to low-end Android phones on unstable 3G/4G connections.

## 3. Users, roles and content

Everyone who uses the app has the same powers; only the operator and future moderators have more, and they use a separate web dashboard.

### Roles

| Role | Where | Can do | Identity |
| --- | --- | --- | --- |
| Reader | Mobile app | Browse, search, filter by area and category, save posts locally | None |
| Poster | Mobile app | Create a case (post) with text and media | None; the case is not linked to the device on the server |
| Commenter | Mobile app | Comment and reply in a case under an optional case-scoped username | Case-scoped tag only |
| Voter | Mobile app | Upvote or downvote cases and comments | Unlinkable vote token |
| Moderator (future) | Web dashboard | Review the hold queue, act on reports from users | Pseudonymous staff key, no real name stored |
| Administrator (now: founder) | Web dashboard | Everything a moderator can do, plus categories, areas, staff keys and settings | Pseudonymous; hardware key required |

### Content types

A **case** is any top-level post. Each case has one content type, which drives its publication tier (section 6).

| Content type | Target share | Examples | Default tier |
| --- | --- | --- | --- |
| Whistleblowing | 50% | Corruption, abuse of authority, police or military abuse, illegal detention, embezzlement, election irregularities | Hold queue when it names people or alleges a crime; otherwise fast track |
| Community information | 30% | Road closures, water or power cuts, health campaigns, missing persons, market prices | Fast track |
| Local news | 20% | Events, public-service updates, local decisions | Fast track |

The 50/30/20 mix is a target for the home feed, not a quota on what users post. The feed ranking blends the three types toward that mix, which also gives users cover: opening Facto looks like reading local news.

### Categories at launch

Categories are data, editable from the dashboard without an app release, and translated in both languages.

- **Whistleblowing:** Corruption · Abuse of authority · Security forces abuse · Illegal detention · Election irregularities · Environmental harm · Other
- **Community information:** Safety alert · Public services · Health · Missing person · Infrastructure · Other
- **Local news:** Events · Local government · Economy · Education · Other

## 4. Core flows

Every flow works without an account. Every write is authorised by a per-case key or an anonymous token (section 5), never by an account or device identifier.

### 4.1 First launch

1. Choose a language (French or English).
2. Three short safety screens: what Facto protects, what it cannot protect (the content itself), and how to use the panic wipe.
3. Optional: set an app PIN and enable disguised mode.
4. The phone silently generates its device secret (section 5). No network call reveals it.
5. Land on the home feed.

### 4.2 Reading

- Home feed blends the three content types toward the 50/30/20 mix, ranked by recency, area and vote score.
- Filters: content type, category, area (province, territory or city, commune). Search runs server-side over published cases only; queries are never logged, stored or tied to a client identifier, and recent results are cached on the phone so repeat searches stay local.
- Case detail: text, media, area, category, vote score, threaded comments.
- Posts can be saved locally (encrypted on the phone, never synced).
- Recently viewed cases are cached for offline reading.

### 4.3 Posting a case

1. Choose the content type, then the category.
2. Pick the area from the administrative list. GPS is never read.
3. Write a title and body. Add up to 4 photos, 1 video (max 60 s) or 1 audio clip (max 3 min).
4. On the phone: media is re-encoded and stripped of metadata; faces can be blurred with one tap.
5. On-device safety check flags phone numbers, emails, ID-like numbers, full names and exact addresses, and suggests removing them.
6. Review screen shows exactly what will be public. The user confirms.
7. The case is sealed and sent (or queued if offline). The app shows the tier: “published” or “in review, usually within 24 hours”.
8. The app stores a case key locally so the poster can later edit or delete their own case without proving who they are.

### 4.4 Commenting with a case-scoped username

1. The user taps “Comment” in a case.
2. **First comment in that case only:** the app asks “Which name do you want to use in this case?”, with three options: a suggested random name (for example `RiverFalcon42`), a name they type, or “Anonymous”.
3. If the typed name is already taken in that case, the app asks for another.
4. A warning appears when the name matches one they used in another case: “Using the same name in several cases lets people guess they are all you.”
5. Every later comment, reply and edit in that case reuses the chosen name automatically. The name cannot be changed inside that case, so the conversation stays readable.
6. In a different case, the user is asked again and starts with no history.

The case's own poster is shown as **Author** in their case's comments, unless they choose otherwise.

### 4.5 Voting

1. Tap up or down on a case or comment. Tapping again removes the vote; tapping the other arrow switches it.
2. The phone spends one anonymous vote token (section 5.4). If tokens are exhausted, the app explains the daily limit.
3. Vote scores feed the ranking. Strongly downvoted content is hidden behind a “low quality” fold, never deleted automatically.

### 4.6 Flags, corrections and disputes

Corrections are a first-class feature, and no correction erases the original history.

| Action | Who | Result |
| --- | --- | --- |
| Flag | Any user (anonymous token) | Reasons: false accusation, personal information, hate or incitement, spam, illegal content, other. Enough flags return the case to the hold queue |
| Suggest a correction | Any user | Goes to moderators; if accepted, a new version is published with an “Updated” label |
| Dispute this information | Any user | Moderators may add a “Disputed” label with a short note |
| Right of reply | A person named in a case, through a web form | Approved replies are attached to the case |
| Edit own case | Author (author key) | Creates a new version; held again if it adds names or allegations |

**Public labels:** Unverified · Disputed · Updated · Corrected · Removed. Every case shows its version history; a removed case keeps a public stub with the removal reason code.

### 4.7 Recovery

Recovery is **off by default** and never creates a server-side identity. Two optional mechanisms:

1. **Per-case recovery code (recommended).** For a case they wrote or commented on, the user can save a short code containing only that case's keys. Restoring it recovers ownership of that one case and its username. Other cases stay unlinkable.
2. **Full recovery passphrase (advanced).** A 12-word passphrase restores the device secret, and with it every case. Before showing it, the app requires the user to confirm a warning: “Anyone who obtains this passphrase can prove all your cases came from the same person.”

Neither mechanism restores vote or flag credentials; a restored phone requests fresh tokens. Nothing about recovery is stored or logged on the server.

### 4.8 Panic wipe and disguised mode

- **Panic wipe:** a long press on the logo, a shake gesture (optional), or a duress PIN erases all local data and keys and returns the app to first-launch state.
- **Disguised mode:** the launcher icon and name change to a neutral one (for example “News”). Opening the app shows the community-information feed until the PIN is entered.

## 5. Anonymity architecture

Facto has no users table. Every identity the server sees is a public key or tag derived on the phone, scoped to one case or one vote, and unlinkable to any other.

### 5.0 Separated identities

Facto uses four kinds of credential, and they must stay cryptographically separate.

| Credential | Scope | Purpose | Derived from |
| --- | --- | --- | --- |
| Case author key | One case | Own, edit, delete a case; check its review status | Device secret + case ID (purpose label `case-author`) |
| Case identity key | One case | Comment under one username inside that case | Device secret + case ID (purpose label `case-identity`) |
| Vote and flag token, plus nullifier | One action | Rate-limited, one-per-item voting and flagging | Blind-signed token; nullifier from device secret + target ID (label `vote` or `flag`) |
| Staff key | One moderator | Sign moderation actions; decrypt the hold queue | Generated on the moderator's hardware key, never derived from a device secret |

> **Invariant:** no key or credential used for posting, commenting, voting, flagging or moderation may be reused across those functions unless the reuse is explicitly required and independently reviewed.

**The one reviewed exception:** a case author who comments in their own case may choose the “Author” label. That comment carries a second signature by the author key, linking the comment to the author *inside that case only*. Authors can decline the label and comment under an ordinary case identity.

### 5.1 Device secret

- On first launch the phone generates a random 256-bit **device secret**, stored in the Android Keystore or iOS Keychain (`expo-secure-store`), never sent anywhere.
- Every key in 5.0 is derived from it with HKDF-SHA256 and a distinct purpose label, so one secret yields unlimited unlinkable keys.
- The device secret is effectively a **master identity secret**: anyone holding it can link every case it produced. That is why recovery is off by default and per-case recovery codes are preferred (section 4.7).

### 5.2 Case-scoped identity (comments)

This is how a username stays consistent inside one case and means nothing outside it.

| Step | On the phone | On the server |
| --- | --- | --- |
| Derive | `seed = HKDF(device_secret, "facto/case-identity/v1" + case_id)` → Ed25519 key pair | — |
| Claim name | Send `{case_id, public_key, display_name}`, signed | Stores the row; `display_name` unique per case; `public_key` unique per case |
| Comment | Sign `{case_id, parent_id, body, timestamp}` with the case key | Verifies the signature, stores comment with `public_key` |
| Edit or delete | Sign the change with the same key | Accepts only if the key matches |
| Recognise own comments | Derive the key for the open case and compare | — |

Result: in Case A, `KivuVoice` always shows as `KivuVoice`. In Case B the same person has a different public key, and the server cannot connect the two. “Anonymous” commenters get a per-case label such as `Anonymous 3`, still backed by a case key.

### 5.3 Case ownership (posts)

- The phone creates the case ID itself (random UUID) and derives `author_key = HKDF(device_secret, "facto/case-author/v1" + case_id)`.
- The case is stored with the author public key and the author's signature over its content. Readers' apps verify signatures, so the server cannot silently alter a post.
- Edit, delete and “check review status” are proven by signing with the author key. No case ID list is kept on the server per device.

### 5.4 Anonymous vote tokens

Votes combine two mechanisms: blind-signed tokens limit how many votes a device can cast, and per-item nullifiers stop a device voting twice on the same item.

1. **Issuance:** at a random time each day, the phone creates N random tokens, blinds them and asks the issuer to sign them (Privacy Pass, RFC 9578: blind RSA or VOPRF). The issuer applies the abuse-resistance checks in section 5.6, then signs. Because tokens are blinded, the issuer cannot recognise them when they are spent.
2. **Casting a vote:** the phone sends `{target_id, value, token, nullifier}`, where `nullifier = HMAC(device_secret, "facto/vote/v1" + target_id)`. Votes leave the phone through a queue with random jitter, never immediately after issuance.
3. **Server checks:** the token's signature is valid and unspent, and the nullifier is new for this target. Changing a vote replaces the row with the same nullifier.
4. **What the server learns:** a valid, unspent token was spent on this item, and this nullifier has not voted on it before. It cannot link two votes to each other, to a post or comment, or to the issuance request that produced the token.

Starting limits (tunable through signed configuration): 50 vote tokens and 10 flag tokens per day. Posting and commenting also spend tokens (10 posts, 100 comments per day) to limit spam. **The token protocol is not locked until an external cryptographic review approves it at the phase 1 gate.**

### 5.5 Metadata minimisation

- **No IP addresses** stored or logged anywhere: reverse proxy access logs off, application logs scrubbed, rate limiting done by tokens rather than IP.
- **Optional Tor:** the app can route traffic through Tor (embedded Arti client), and Facto runs an onion service.
- **Coarse timestamps:** stored times are rounded to the hour for cases and to 10 minutes for comments; exact submission time is never stored.
- **No third-party SDKs** that report to outside servers: no Firebase, Google Analytics, Facebook SDK or ad SDKs.
- **No push notifications in V1.** Push services (Google FCM, Apple APNs) expose a device token. The app refreshes when opened instead.
- **Crash reports** are opt-in, scrubbed on the phone, and sent to a self-hosted GlitchTip instance.
- **Media** is re-encoded on the phone, which removes EXIF and GPS tags, camera serials and editing history. The in-app camera never writes to the gallery.

### 5.6 Abuse resistance and trust signals

This section is deliberately separate from the anonymity architecture. Its mechanisms limit abuse but add trust assumptions and correlation risks of their own.

| Signal | Benefit | Cost to anonymity |
| --- | --- | --- |
| Play Integrity device recall (Android), DeviceCheck bits (iOS) | Limits tokens per physical device, even across reinstalls | Google or Apple learn the app requested attestation; the platform keeps a persistent per-device marker; the issuer sees one verdict per issuance request |
| Proof-of-work | Works for APK and Tor users with no platform dependency | None on identity; costs battery and time; weaker against well-funded abusers |
| Daily token allowance | Caps the damage from any single device | None beyond the issuance request itself |

Rules that keep these signals away from identity:

- The issuer stores only daily counters per attestation bucket. It never stores verdict tokens, request times or network data.
- Issuance happens at a random time and is unlinkable to spending, because of blinding and the jittered queue.
- No attestation result is ever passed to the content API.

**Open decision (phase 1 gate):** use platform attestation in V1, or launch with proof-of-work and allowances only. The external cryptographic review decides.

### 5.7 Metadata correlation

The goal is not to remove every technical fingerprint. It is to identify each possible correlation signal and minimise it.

| Signal | Mitigation |
| --- | --- |
| File names | Replaced by random IDs on the phone |
| EXIF, GPS, camera serials | Removed by re-encoding on the phone |
| Video and audio metadata | Re-muxed with all metadata tracks and atoms stripped |
| Document metadata | Documents not accepted in V1 |
| Media dimensions | Resized to a fixed set of standard sizes |
| Codec fingerprints | Single app-side encoder and settings for every upload |
| Thumbnails and blurhash | Generated on the server from the cleaned file, never from the original |
| Upload order and exact timestamps | Coarse stored times; uploads padded and sent in shuffled order |
| Text | Normalised to Unicode NFC; invisible characters and unusual whitespace removed |
| Generated IDs | Random UUIDv4 only; no time-based or sequential IDs |
| Search queries | Never logged or retained (section 4.2) |

### 5.8 Sealed submission envelope

Every write (case, comment, vote, flag, edit) leaves the phone as a sealed envelope. Only the intake service can open it, so a compromised proxy, load balancer, log pipeline or network path sees nothing but fixed-size ciphertext. The same format is what mesh relay will carry in Phase 2.

| Field | Rule |
| --- | --- |
| Version | Format version, so the envelope can evolve |
| Message ID | Random 128-bit value; never derived from the device or the content |
| Expiry (TTL) | Coarse day; default 7 days for cases, 2 days for votes and comments |
| Sealed payload | X25519 sealed box to the current intake public key; inside is the signed case, comment or vote plus its tokens |
| Padding | Padded to fixed size buckets (4 KB for text; media sent as fixed-size encrypted chunks) |
| Sender, device, route, location | Never present |

Intake rules:

- Decryption happens only in the intake service's memory; plaintext is never written to logs or disk before the normal database write.
- Duplicate and replay protection: message IDs are kept until their expiry; a repeated ID is dropped silently, and expired envelopes are rejected.
- Tampering: the sealed box is authenticated, and the inner payload carries the author's signature, so any modification is detected.
- Intake keys rotate weekly, each signed by the offline root key; the previous key stays valid until the longest TTL has passed.

## 6. Moderation and safety pipeline

Every case passes automatic checks; the risk score decides whether it goes live immediately or waits for human review.

> _Diagram omitted from this export: tiered publication flow · 2 tiers, 1 review step._

High-risk cases and flagged posts wait for a human; approved ones go live after a random delay so timing cannot point to the poster.

> **Automation never censors.** Automatic checks may classify, delay, suggest redactions or quarantine content. They must never permanently delete potentially legitimate civic information on a classifier's judgement alone. Only exact-duplicate spam is rejected automatically, and even that is restorable for 30 days.

### 6.1 Automatic checks

| Check | Where | Detects | Effect |
| --- | --- | --- | --- |
| Personal data | Phone, then server | DRC phone numbers (+243), emails, ID-like numbers, licence plates, exact addresses | Phone suggests removal; any left → hold |
| Named people | Phone, then server | Capitalised full names, titles + names (“le colonel X”, “Minister Y”) | Whistleblowing → hold |
| Allegation language | Server | Crime and accusation terms in French, English, Lingala, Swahili, Kikongo, Tshiluba | Whistleblowing → hold |
| Incitement and hate | Server | Curated lexicon of ethnic slurs and calls to violence, region-aware | Always hold, high priority |
| Spam and duplicates | Server | Repeated text, link spam, near-duplicate media | Reject or hold |
| Media | Phone | Faces (blur offered), visible documents and IDs | Unblurred faces in whistleblowing → hold |
| Media | Server | Graphic violence, nudity | Hold with a content warning |

Lexicons and thresholds are dashboard data, updated without an app release. The models run on Facto's own servers; no content is sent to outside AI or moderation APIs.

### 6.2 Tiers

- **Fast track:** community information and local news that pass every check go live at once.
- **Hold queue:** whistleblowing that names people or alleges a crime, and anything else a check flags. Target review time: 24 hours.
- **Rejected:** spam, and content that breaks the rules. The poster sees the reason code through their case key, and can edit and resubmit.

Approved held cases are published after a **random delay of 1 to 6 hours**, so the publication time does not reveal when the poster submitted.

### Reason codes

Every non-published state has a distinct code, visible to the author through their case key.

| Code | Meaning | Set by | Author sees |
| --- | --- | --- | --- |
| `safety_hold` | Waiting for human review | Automatic checks | “In review” plus expected wait |
| `changes_requested` | Moderator asks for edits (for example, a name removed) | Moderator | The request and an edit button |
| `moderation_rejected` | Breaks the content rules | Moderator only | The rule broken; can edit and resubmit |
| `spam_rejected` | Exact duplicate or link spam | Automatic or moderator | “Rejected as spam”; restorable for 30 days |
| `technical_failure` | Upload or processing error | System | “Something went wrong, retry”; never counted as moderation |
| `expired` | Held longer than 14 days | System | “Expired”; can resubmit |
| `unpublished` | Removed after publication | Moderator | The rule broken; public stub stays |
| `legal_removal` | Removed after a legal request | Administrator | “Removed after a legal request”; listed on the transparency page |

### Urgent public-safety alerts

Some information is urgent and dangerous at once, for example “Armed men are moving toward village Y tonight.” Facto treats this as its own sub-type, **Urgent alert**, with these proposed rules:

- Sub-types: imminent threat, armed movement, natural disaster, missing person.
- If the alert names no individual and no ethnic or community group, it publishes immediately with a banner: “Unverified urgent alert. Check with local sources.”
- If it names a person or a group, it goes to the top of the hold queue. The classifier never decides alone.
- Every urgent alert enters the moderator queue for after-publication review, even when it went live.
- Alerts expire after 48 hours unless a moderator extends them, and they cannot be voted to the top of the feed.
- Stricter limit: one urgent alert per device per day.

### 6.3 Moderator actions

Approve · Approve with redaction (moderator blurs or removes a detail; the poster is told) · Request changes · Reject with reason · Unpublish · Add a public note (“unverified”, “disputed”, “corrected”). Every action is an event signed by the moderator's staff key. Logs never contain poster identity, because none exists.

**Immutable moderation history.** Moderators must never be able to silently modify or delete earlier moderation events.

- Event types: `submitted` → `auto_hold` → `reviewed` → `approved` or `rejected` → `published` → `flagged` → `unpublished` → `restored` → `corrected`.
- The events table is append-only: the database role used by the API and dashboard has no UPDATE or DELETE rights on it.
- Each event includes the hash of the previous event, forming a hash chain. The daily chain head is published on the transparency page, so any rewrite is detectable.

### 6.4 After publication

- User flags (section 4.6) send content back to the hold queue once a threshold is reached (default: 5 flags, or 2 for incitement).
- **Right of reply:** a person named in a case can submit a reply through a web form. Approved replies appear attached to the case.
- **Legal requests** go to a published contact address. Facto can remove content but has no user data to hand over, and the transparency page says so.

### 6.5 Solo operator safeguards

- If the hold queue exceeds 48 hours, the app tells new whistleblowing posters the expected wait.
- Held items older than 14 days expire; the poster sees “expired” and can resubmit.
- Rejected and expired content is permanently deleted after 30 days.
- Hold-queue content is encrypted to the moderators' public keys, so a database leak does not expose unpublished reports.

### 6.6 Abuse scenarios

| Scenario | Handling |
| --- | --- |
| Coordinated harassment of a person | Hold rule for named people; repeated cases about the same name raise priority; right of reply |
| Brigading a case with comments | Per-case comment rate limit; moderators can lock or slow-mode a case |
| Mass flagging to silence content | Flags cost tokens; flag thresholds scale with case visibility; a held case is reviewed, never deleted by flags alone |
| Fake eyewitness reports | “Unverified” label by default on whistleblowing; disputes and corrections; no “verified” claim in V1 |
| Coordinated vote campaigns | Token limits; anomaly alerts on sudden score swings; ranking caps for new cases |
| Impersonation inside a case | Usernames unique per case; look-alike names blocked (case- and accent-insensitive matching) |
| Malicious replies | Comments run the same checks as cases; personal data and incitement held |
| Doxxing | Personal-data checks on cases and comments; doxxing removal fast-tracked |
| Re-posting removed content | Server-side text and perceptual-media hashes of removed content; matches held |
| Extremist or incitement campaigns | Always-hold lexicon, updated through signed config; low flag threshold; circuit breaker on sudden volume from one area |
| Child sexual abuse material and other illegal media | Server-side perceptual hash matching against known lists; immediate quarantine; never shown to moderators unblurred; reporting obligations confirmed by legal review |

## 7. Security architecture

Security rests on three layers: the phone keeps the secrets, the server keeps no identity, and the operator keeps no public footprint. An independent audit is required before public launch.

### 7.1 Cryptography

- Only audited libraries: libsodium (`react-native-libsodium` on the phone, `libsodium-wrappers` on the server), plus a maintained Privacy Pass implementation for vote tokens. No custom cryptography.
- Primitives: Ed25519 signatures, X25519 + XChaCha20-Poly1305 sealed boxes, HKDF-SHA256, HMAC-SHA256, Argon2id for the PIN.
- Every signed payload carries a version and purpose label, so keys from one feature can never be replayed in another.
- Key rotation for the token issuer and moderator keys is scheduled and documented before launch.

### 7.2 Phone

- Local database encrypted with SQLCipher (`op-sqlite`); its key is wrapped by the Keystore or Keychain and, when set, the PIN.
- Screenshots and screen recording blocked on sensitive screens (Android `FLAG_SECURE`, iOS screen-capture detection).
- Media captured in-app stays in the app sandbox; nothing is written to the gallery or shared clipboard.
- Root and jailbreak detection shows a warning; it does not block use.
- Panic wipe destroys the keys first, then the data, so a partly completed wipe still leaves data unreadable.
- Duress PIN opens an empty, normal-looking app while wiping in the background.

**Location isolation (invariant).** The app must contain no permission, API, dependency or code path capable of requesting device location. CI fails the build if any of these appear: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, any iOS `NSLocation*` usage key, `expo-location` or any other location SDK, or calls to location APIs in the compiled bundle.

**Permission matrix (V1).** Checked against the built Android manifest and iOS `Info.plist` on every release.

| Permission | V1 | When requested |
| --- | --- | --- |
| Camera | Yes | Only when the user opens the in-app camera |
| Microphone | Yes | Only when recording audio or video |
| Photo library | Limited picker only | Only when importing media; no full-library access |
| Internet | Yes | Always (required) |
| Notifications | No | — |
| Location (any) | No | — |
| Contacts | No | — |
| Phone state, call logs, SMS | No | — |
| Bluetooth, nearby devices | No | — |
| Advertising ID | No (`AD_ID` explicitly removed) | — |
| Storage (broad) | No | — |

### 7.3 Server

- Hosted outside the DRC, with a provider in a jurisdiction with strong press-freedom protection (to decide: Iceland, Switzerland or Germany).
- TLS 1.3 only, HSTS, certificate pinning in the app with a backup pin.
- Services separated: public API, token issuer, media service and dashboard API each have their own credentials and database role with the least privileges needed.
- Database encrypted at rest; backups encrypted with a key held offline.
- No identity data exists, so the main asset to protect is integrity: signed content, append-only moderation log, alerts on unusual admin actions.
- Abuse protection by tokens, not IPs; a global circuit breaker slows posting during floods.

### 7.4 Operator anonymity

- No founder name on the website, app store listing, terms or code repositories. Public contact goes through a role address.
- Domain registered with WHOIS privacy; hosting and store accounts held by a legal entity, not a personal name (entity choice: open question, section 10).
- Dashboard reachable only over Tor or a private VPN, protected by a FIDO2 hardware key. No password-only logins.
- Founder's own devices: separate phone and browser profile for Facto work, full-disk encryption, no Facto login on personal accounts.
- Moderator keys are pseudonymous, so a future team member can be added or removed without exposing anyone.

### 7.5 Supply chain and releases

- Dependencies pinned and audited in CI (`npm audit`, OSV scanner); new dependencies need a written reason.
- Release builds are signed, with the APK signature fingerprint published on the website and onion service.
- Source code published once the audit is complete, so outsiders can verify the anonymity claims.

**Dependency privacy gate (CI and release blocker).** Expo and native modules form a large supply chain. Every direct and transitive dependency is reviewed for:

- network activity and the hosts it contacts;
- telemetry, analytics or crash reporting;
- device identifiers;
- location access;
- native permissions it adds;
- its own transitive dependencies.

The review result is recorded in `DEPENDENCIES.md`. A network-traffic test runs the release build in an emulator and fails if the app contacts any host other than Facto's own domains and onion service. Expo telemetry and EAS Update are disabled.

### 7.6 Assurance

- Threat model reviewed at each phase gate.
- Independent security audit of the app, API, token issuer and crypto design before public launch.
- Transparency page: what Facto stores, legal requests received, content removed per quarter.
- Bug bounty or responsible-disclosure address from launch.

### 7.7 Compromise tests

These are formal audit and penetration test cases, not principles. Each must pass before launch.

| Test | Attacker has | Must hold |
| --- | --- | --- |
| Compromised server | Full database dump, object storage, all application and moderation logs, token-issuer database, source code, server configuration | Cannot derive any poster's, commenter's or voter's real-world identity, and cannot link activity across cases, beyond what the public content itself reveals |
| Compromised operator | Legitimate dashboard access and every server-side credential | Cannot map any published case, comment or vote to a real-world identity, or to the same phone across cases |
| Malicious server | Control of every server response | Cannot make the app reveal the device secret, recovery material, private keys or location; cannot run new code in the app; altered content is flagged by signature checks |
| Seized phone, locked | Physical device, no PIN | Cannot read the local database or keys |
| Seized phone, after panic wipe | Physical device after wipe | Cannot recover local data; keys verifiably destroyed |
| Network observer | Mobile operator traffic | Sees encrypted traffic to Facto only (or Tor traffic); no content, no identifiers |

## 8. System architecture, stack and data model

Facto is a mobile app, a web dashboard and four small backend services on self-hosted infrastructure. No Firebase and no third-party auth.

> _Diagram omitted from this export: system architecture · phone, 7 server components, 2 outside parties._

All secrets stay on the phone; the token issuer is isolated from the content database so it cannot connect tokens to votes.

### 8.1 Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Mobile app | Expo (React Native) with development builds, TypeScript, Expo Router | Known stack; dev builds allow the native crypto and SQLCipher modules |
| Phone storage | `op-sqlite` with SQLCipher, `expo-secure-store` | Encrypted local data, keys in hardware-backed storage |
| Phone crypto | `react-native-libsodium`, Privacy Pass client | Audited primitives |
| Tor | Arti (embedded) | Optional anonymous transport |
| API | Node.js + TypeScript, Fastify, Zod validation | Same language as the app; signature and token checks need custom logic |
| Database | PostgreSQL 16 | Relational data, row-level roles, mature tooling |
| Media | S3-compatible object storage (self-hosted MinIO or the host's own) | No Cloudinary: no third party sees the media |
| Token issuer | Separate Fastify service with its own key and database | Isolated from content, so it cannot link tokens to votes |
| Moderation workers | Node.js job queue (pg-boss) running the checks | Same database, no extra infrastructure |
| Dashboard | React + Vite web app; hold-queue decryption in the browser | Moderator keys never reach the server |
| Monitoring | Self-hosted GlitchTip and Prometheus/Grafana, no IPs | Visibility without leaking metadata |
| Infrastructure | Docker Compose on 2 VPS at launch, Caddy reverse proxy, onion service | Simple for one operator, portable to a larger setup later |

**Why not Supabase:** Facto uses none of Supabase Auth, and every write must pass signature and token checks that are cleaner in a dedicated API. Plain PostgreSQL keeps the stack small and fully self-hosted. Decision confirmed: self-hosted PostgreSQL with a custom Fastify API. Hosted Supabase is excluded: its gateway logs client IPs and the data would sit under another company's legal jurisdiction. Self-hosted Supabase could be layered onto the same database later if its tooling becomes worth the extra components.

### 8.2 Data model

There is no `users` table. Every identifier below is either random or derived on the phone.

| Table | Key fields | Notes |
| --- | --- | --- |
| `regions` | id, parent\_id, level, name\_fr, name\_en, country\_code | Country → province → territory or city → commune; generic for other countries |
| `categories` | id, content\_type, name\_fr, name\_en, active | Edited from the dashboard |
| `cases` | id (client UUID), content\_type, category\_id, region\_id, title, body, lang, author\_pubkey, signature, status, score, created\_hour | Status: held, published, rejected, expired, removed |
| `case_media` | id, case\_id, storage\_key, kind, width, height, duration, blurhash | Media already stripped and re-encoded on the phone |
| `case_identities` | case\_id, pubkey, display\_name | Unique (case\_id, pubkey) and (case\_id, display\_name) |
| `comments` | id, case\_id, parent\_id, author\_pubkey, body, signature, status, score, created\_10min | author\_pubkey references `case_identities` |
| `votes` | target\_type, target\_id, nullifier, value | Unique (target\_id, nullifier); no token or time stored |
| `spent_tokens` | token\_hash, spent\_day | Double-spend check; purged after token expiry |
| `flags` | target\_type, target\_id, nullifier, reason | Same nullifier scheme as votes |
| `held_payloads` | case\_id, sealed\_box | Hold-queue content encrypted to moderator keys |
| `moderation_log` | id, target, action, reason, moderator\_key\_id, hour | Superseded by moderation\_events below: append-only, hash-chained (section 6.3) |
| `staff_keys` | id, pseudonym, public\_key, role, active | No real names |
| `replies_right` | id, case\_id, body, status | Right-of-reply submissions |

**Versioning.** Content is never rewritten in place. `cases` holds only a pointer to the current published version; every change creates a new row.

| Table | Key fields | Notes |
| --- | --- | --- |
| `case_versions` | case\_id, version, title, body, media\_refs, author\_signature, moderation\_status, publication\_status, created\_hour | Distinguishes original submission → moderated version → published version → later correction |
| `comment_versions` | comment\_id, version, body, author\_signature, status, created\_10min | Same rule for comments |
| `moderation_events` | id, target, version, event\_type, reason\_code, staff\_key\_id, prev\_hash, hash, hour | Append-only, hash chain; no UPDATE or DELETE grants |
| `removed_hashes` | kind, perceptual\_hash | Detects re-posting of removed content; stores no content |

A redaction by a moderator is a new version signed by the staff key, with the author's original kept sealed for the retention period (section 11).

The token issuer has its own database with only issuance counters per attestation bucket, and nothing about votes.

## 9. UI/UX, language and geography

Facto borrows the HelpNest reference's layout and components (clean cards, image-led feed, dark pill buttons, bottom bar with a central “+”) and replaces its colors, social features and identity screens with Facto's.

### 9.1 What to keep from the reference

- **Card-based feed** with a large media area, a compact author line, and an action row under the image.
- **Bottom navigation** with five slots and a central “+” pill for posting.
- **Search screen** with a search field, a filter button, and a segmented control (“For you” / “Map view” becomes “Feed” / “Map”, showing areas, never precise points).
- **Segmented tabs** (“All” / “Unread” style) for feed filters and the notifications list.
- **Two-step create post** (choose media, then caption and options with a full-width pill “Share” button).
- **Grouped settings list** with icons and section titles.
- **Explore grid** of two-column media tiles.
- Rounded corners, generous white space, one bold type family, full-width primary buttons with an arrow icon.

### 9.2 What to remove or replace

| Reference element | In Facto |
| --- | --- |
| Sign up, Google login, profile, edit profile, change password | Removed: no accounts |
| Stories row of user avatars | Category chips (Whistleblowing, Community, News) and area chips |
| Follow buttons, follower counts | Removed: no social graph |
| Direct messages | Removed in V1 (high linkage risk) |
| Likes, comments, shares counts | Up/down score and comment count |
| “Tag people”, “Add location” (GPS) | “Choose area” from the administrative list; no tagging |
| Avatar photos | Generated abstract shapes per case identity, never photos |
| Goals, events, payment | Removed |
| Profile tab in nav | “My activity”: local-only list of own cases, drafts and saved posts |

### 9.3 Colors and theme

- **Default dark theme:** background `#030F08`, raised surfaces a few steps lighter, text near-white.
- **Accent `#00FF9D`** used sparingly: primary buttons, the “+” pill, active tab, positive score. Never as large backgrounds.
- **Light theme** following the reference's white layout, with the same accent darkened for contrast on white.
- Content-type tags with distinct, color-blind-safe hues (whistleblowing, community, news) plus a text label.
- Eye-based logo kept, except in disguised mode, which uses a neutral news icon.
- All text and controls meet WCAG 2.1 AA contrast.

### 9.4 Language

- French and English at launch; the device language is the default, changeable in Settings.
- All strings in translation files from day one (`i18next`). No hard-coded text.
- Posts store their language; the feed shows both, with a filter.
- The structure allows Lingala and Swahili to be added later without code changes.

### 9.5 Geography

- Administrative areas only: country → province → territory or city → commune (the 26 DRC provinces at launch).
- The area list ships inside the app and updates from the server, so the picker works offline.
- The map view shows counts per area, never individual points. An area with fewer than 5 published cases in the selected period shows no count, and counts are rounded to the nearest 5, so the map cannot reveal that a single report exists in a small commune.
- `regions.country_code` lets a new country be added as data.

### 9.6 Low-end devices and networks

- Target: Android 8+, 2 GB RAM, app size under 40 MB.
- Images compressed to under 300 KB before upload; videos to 720p.
- Offline queue for posts, comments and votes, sent automatically when the connection returns.
- A data-saver mode loads images only on tap.

## 10. Requirements, phases, risks and open questions

Public launch is gated on the security audit, not on a date.

### 10.1 Non-functional requirements

| Area | Requirement |
| --- | --- |
| Privacy | Zero personal identifiers stored; verified by a database schema review and log inspection before each release |
| Performance | Feed's first screen under 3 s on a 3G connection with a 2 GB Android phone |
| Availability | 99.5% monthly for reading; posting queues offline when the server is down |
| Scale (year 1) | 50,000 monthly readers, 2,000 cases and 30,000 comments per month on the launch infrastructure |
| Moderation | Held cases reviewed within 24 hours at launch volume |
| Accessibility | WCAG 2.1 AA; screen-reader labels on all controls; text scaling up to 200% |
| Localization | 100% of strings in French and English |
| Security | No high or critical audit findings open at launch |

### 10.2 Release phases

1. **Foundation (crypto and identity core).** Device secret, key derivation, case identities, signed payloads, SQLCipher storage, panic wipe. Gate: unit tests, plus an external cryptographic review of key derivation, the token protocol and the attestation decision (section 5.6).
2. **Backend core.** API, database, media service, token issuer, moderation workers. Gate: integration tests and a log audit showing no IP or identifier leakage.
3. **App V1.** Feed, case detail, posting, comments, voting, flags, recovery, disguised mode, French and English. Gate: internal testing on low-end Android phones.
4. **Dashboard.** Hold queue, moderator actions, categories and regions, transparency stats. Gate: end-to-end moderation test.
5. **Closed pilot.** 30 to 100 trusted testers in 2 or 3 DRC cities (Kinshasa, Goma, Lubumbashi suggested). Gate: pilot feedback addressed.
6. **Independent security audit.** Gate: every launch blocker in section 12 cleared.
7. **Public launch (DRC).** Store and APK release, transparency page, source code published.
8. **After launch.** Moderation team onboarding, Lingala and Swahili, partner organizations, mesh relay (Appendix A), other countries.

### 10.3 Main risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| A poster is identified by the details of their content | Physical harm | Hold queue, on-phone PII checks, redaction, clear user education |
| False or defamatory accusations go viral | Harm to named people; legal exposure | Hold queue for named allegations, right of reply, “disputed” labels |
| Incitement spreads in conflict areas | Violence | Always-hold rule for incitement, low flag threshold |
| Founder overwhelmed as sole moderator | Backlog, unsafe content | Queue limits, expiry, recruiting moderators as early as funding allows |
| Founder identified and pressured | Personal risk; platform takeover | Operator anonymity measures; legal entity outside the DRC |
| App blocked or removed from stores | Loss of access | Signed APK, onion service, alternative domains |
| Vote manipulation via many devices | Distorted rankings | Attestation-bound tokens; ranking caps for new cases |
| Attestation services (Google, Apple) see app usage | Small metadata leak | Only device-level verdicts used; APK path with proof-of-work |

### 10.4 Open questions

- [ ] Legal entity and jurisdiction for Facto (NGO, foundation or company; where registered).
- [ ] Legal review of platform liability for user content under DRC law and in the hosting country.
- [ ] Hosting provider and country.
- [ ] Funding model for audit, hosting and future moderators (grants from press-freedom or digital-rights funds are the most likely fit).
- [ ] Final daily limits for votes, posts and comments after the pilot.
- [ ] Whether to label cases with “verified” in the future, and who would verify.
- [ ] Which local languages to add first after launch.

* [ ] Confirm the urgent-alert policy (section 6.2), especially immediate publication for alerts that name no person or group.
* [ ] Platform attestation in V1, or proof-of-work only (section 5.6).
* [ ] Legal obligations for reporting illegal material, in the DRC and the hosting country.

## 11. Data retention and disaster recovery

Facto keeps the minimum for the shortest time, and a restore must never bring back data the retention policy has deleted.

### 11.1 Retention schedule

| Data | Kept for | Then |
| --- | --- | --- |
| Published cases and comments (all versions) | While published | Removed with the case; public stub stays |
| Unpublished or removed cases | 90 days, sealed to staff keys | Permanently deleted; stub and reason code stay |
| Rejected and expired cases | 30 days | Permanently deleted |
| Author originals behind redactions | 90 days, sealed | Permanently deleted |
| Votes (nullifier and value) | While the target exists | Deleted with the target |
| Flags | 90 days | Aggregated into counts, rows deleted |
| Spent-token records | Until the token's expiry day plus 1 day | Deleted |
| Token-issuer counters | 2 days | Deleted |
| Moderation events | Life of the platform | Never deleted (hash chain); contain no personal data |
| Media files | Same as their case version | Deleted with it |
| Server logs (errors only, no IPs) | 7 days | Deleted |
| Crash reports (opt-in, scrubbed) | 30 days | Deleted |
| Backups | 14 days, rolling | Overwritten |
| Right-of-reply submissions | Same as the case | Deleted with it |
| Local data on the phone | Until the user deletes it or wipes | Keys destroyed first, then data |

### 11.2 Backups and disaster recovery

- **Frequency:** daily encrypted database snapshot and object-storage sync; 14-day rolling window.
- **Storage:** a second provider in a different country, encrypted with a backup key held offline by the administrator.
- **Deletion ledger:** every permanent deletion writes a tombstone (ID and deletion date, no content) to a separate ledger that is never rolled back. After any restore, the ledger is replayed first, so deleted content cannot return.
- **Restore procedure:** documented, run on a staging copy, then promoted. Tested every quarter.
- **Compromise recovery:** if a server is breached, rebuild from clean images, rotate the issuer, config and staff keys, publish a notice on the transparency page, and force app clients to re-pin the new keys through a signed key-rotation message from the offline root key.
- **Key ownership:** the offline root key, the backup key and the config-signing key are each held on separate hardware keys, with a sealed recovery copy stored apart from the founder.

## 12. Launch blockers

This list defines “production ready”. **Facto must not launch publicly while any of these is true:**

- [ ] A critical or high security vulnerability remains open.
- [ ] The anonymity architecture and token protocol have not passed an independent review.
- [ ] Any compromise test in section 7.7 fails.
- [ ] Server logs contain IP addresses or unexpected identifiers.
- [ ] Any third-party telemetry, analytics or crash reporting is active.
- [ ] Any location permission, SDK or API call exists in the build.
- [ ] The permission matrix or dependency gate fails.
- [ ] Recovery can link cases without the user's explicit, warned choice.
- [ ] Hold-queue plaintext is reachable outside a moderator's browser session.
- [ ] The server, or the operator, can derive a poster's identity.
- [ ] Panic wipe fails, or the local database is readable after key destruction.
- [ ] The public feed or API can return unpublished content.
- [ ] The moderation event log can be altered without detection.
- [ ] Content safety rules, reason codes and the urgent-alert policy are not operational.
- [ ] A database restore can bring back permanently deleted content.
- [ ] The legal review is incomplete.

## Appendix A. Mesh relay (Phase 2, not in V1)

Mesh relay lets envelopes hop from phone to phone during internet shutdowns until one phone reaches the internet. It protects connectivity, not the server. It ships only after V1 is stable and every precondition in A.3 is met.

### A.1 Requirements

| Requirement | How Facto meets it |
| --- | --- |
| End-to-end encryption | Relays carry the sealed envelope (section 5.8), encrypted to the intake key; no relay can read it |
| Rotating identities | No stable device identifier on the radio; any advertised identifier rotates at least every 15 minutes and is random |
| Replay protection | Random message ID plus expiry; the intake service drops repeated IDs; relays drop IDs they have already carried |
| Relay tamper protection | Authenticated encryption plus the author's signature inside; a modified envelope fails at intake |
| TTL | Every envelope expires (default 7 days); relays delete expired envelopes; a hop limit (default 8) is also enforced |
| Duplicate detection | Relays compare a keyed hash of the message ID, never the content; seen-lists are kept only until expiry |
| Sybil resistance | Envelopes still need valid anonymous tokens to be accepted at intake, so fake relay identities cannot mint accepted content; relays also cap envelopes accepted per peer per hour |
| Key management | Weekly intake keys signed by the offline root key, shipped with app updates and as signed key bundles over mesh |
| Metadata minimisation | No sender, receiver, device, route or location fields; coarse expiry only; fixed-size padding; relays store no record of who handed them what |
| Origin anonymity | Envelopes are held for a random delay and mixed with others before forwarding, so a relay cannot easily tell whether a neighbour created a message or relayed it. This is partial: the first relay is physically near the sender |

### A.2 Known limits

- **Physical proximity.** Anyone relaying is within a few dozen metres of the previous holder. Mesh can never hide that two phones were close together.
- **Radio detectability.** A phone running mesh broadcasts. A scanner at a checkpoint could detect that Facto mesh is active nearby, even without seeing content.
- **Battery and reliability.** Mobile operating systems restrict background radio use, especially iOS. Delivery can take hours or days.

### A.3 Preconditions before mesh can ship

- [ ] Works without any location permission: Android 12+ `BLUETOOTH_SCAN` and Android 13+ `NEARBY_WIFI_DEVICES`, both declared with `neverForLocation`. On older Android versions, mesh stays unavailable rather than requesting location.
- [ ] Radio fingerprint study: no fixed service UUID, name or pattern that identifies Facto to a scanner, or the risk is accepted in writing after review.
- [ ] Off by default, opt-in per session, with a plain warning about radio detectability; turns itself off after a set time.
- [ ] Panic wipe also erases every relayed envelope and seen-list.
- [ ] Independent security review of the mesh protocol.
- [ ] Permission matrix and location-isolation tests updated and passing.
