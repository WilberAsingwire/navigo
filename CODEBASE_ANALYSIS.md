# NAVIGO — Deep Codebase Analysis
**Date:** 2026-10-05 · **Branch:** `arena/a985a898-navigo` (from `main` @ `e67ddb1`)

---

## 🛠️ FIX LOG (2026-10-05 — Week-1 round, all verified: backend `tsc` ✅, frontend `tsc` ✅, prod build ✅, unit tests ✅, boot smoke test ✅)

| # | Issue | Fix |
|---|---|---|
| C1 | Driver Home crashed (`IonToast` not imported); `setVisualScale` runtime error in NavigoMap | Imported `IonToast`; removed dead `setVisualScale` call; narrowed map style type |
| **NEW-C11** | **PostgreSQL lowercases unquoted identifiers** — `ride.fareFinal`, `ride.driverId`, `user.fullName`, `totals.totalEarnings` etc. were all `undefined` on PG (codebase was written against case-preserving SQLite). This silently broke settlement amounts, driver authorization checks, and most API payloads | Central camelCase normalization layer in `database.ts` (`normalizeRow`) applied to `get/all/run` and transaction clients — both key spellings now work |
| C4 | Fare bargaining was a no-op (`fareFinal` always = recommended fare) | `fareFinal` now = the clamped rider offer; wallet pre-check and settlement now charge the same number |
| C6 | Bans/suspensions never enforced | New `utils/userStatus.ts` (60s-TTL cached check). Enforced in: login (post-password), `authenticate` middleware (403), socket handshake. Admin ban/delete invalidates cache + force-disconnects live sockets |
| C7 | `JWT_SECRET` read before dotenv loaded → crash with `.env`-only config | New `loadEnv.ts` imported first in `index.ts`; verified by booting with secrets only in `.env` |
| C8 | Silent in-memory mock-DB fallback in production | Production now fails fast on PG connection failure (mock allowed only in dev or `USE_MOCK_DB=1`); verified both paths |
| C9 | Driver alert overlay Accept/Reject were console.log stubs | Context now fetches real ride details, emits real `accept-ride`, waits for server `accept-confirmed`/`error` with 10s timeout, auto-dismisses after 20s or on `ride-taken`, suppressed on pages with their own request UI |
| H1 | `expiresAt` never enforced (stale requests locked riders out, acceptable forever) | Enforced in socket `accept-ride`, REST `/status` accept, `/active` (expired ≠ active), and `/request` (auto-cancels the rider's stale requests) |
| H3 | Optimistic accept (driver navigated before server confirmed) | Server emits `accept-confirmed` to the winning driver; `IncomingRequest` + overlay both wait for it (or show the race-loss error) |
| H5 | Driver earnings overstated ~11% (summed 100% of fares) | Stats now report the real 90% share (`fareFinal − commission`), consistent with settlement |
| H6 (partial) | Top-up double-credit race | `UNIQUE INDEX` on `wallet_transactions.reference` (fault-tolerant creation) + graceful 23505 handling in `/wallet/topup` |
| H8 | SMS sent in local `07…` format (undeliverable via Africa's Talking); reset codes stored in plaintext | SMS normalized to `+256…` via `normalizeUgPhone`; reset codes now SHA-256 hashed at rest |
| H10 (partial) | No DB indexes | Added indexes: `rides(userId,status)`, `rides(driverId,status)`, `rides(requestedAt)`, `wallet_transactions(userId,createdAt)`, `users(role,isOnline,isAvailable)`, `payouts(userId,createdAt)` |
| M2 | Type errors could ship (build didn't run tsc) | `build` script is now `tsc --noEmit && vite build`; fixed all 8 pre-existing TS errors (incl. landing page "UGX undefined" — real prices/ETAs added; `'free'`-promo crash in RideRequest) |
| M8 | `/register` leaked DB internals (`detail`, constraint messages) to clients | Generic client message; details only server-side logs |
| — | Ride-history bugs: `verificationStatus` aliased as `driverRating`; ambiguous `status` column after join | Joins `driver_profiles` for the real rating; qualified `r.status` / `r.requestedAt` |

**Still open (next rounds):** C2 real top-up gateway flow, C3 payouts via `/v3/transfers`, C5 failed-settlement recovery, C10 real OTP verification, H2 proximity/vehicle-type matching, H4 chat persistence, H9 OAuth token-in-URL, H11 helmet/body limits/doc storage, H12 CORS deny-by-default, H13 CGNAT-aware rate limits, and the Medium/Low lists below.
**Scope:** Entire repo — backend (Express + PostgreSQL + Socket.io), frontend (Ionic React + Vite), infra/config, repo hygiene. Both projects were dependency-installed, type-checked (`tsc --noEmit`) and production-built as part of this audit.

---

## Verdict at a glance

| Area | Grade | Summary |
|---|---|---|
| Architecture & structure | **B+** | Clean separation (routes/services/utils/middleware), sensible monorepo |
| Security fundamentals | **B** | Parameterized SQL, JWT auth, ownership checks, rate limits — genuinely good |
| Money / settlement logic | **C** | Transactions + locks are done right, but fare & payment flows have real bugs |
| Payments integration | **D** | Top-up is simulated end-to-end; gateway endpoints are the wrong APIs |
| Frontend correctness | **C+** | Builds, but `tsc` fails with 8 errors — one of which **crashes the Driver Home page at runtime** |
| Realtime / matching | **C** | Secure socket layer, but no proximity matching, no ride expiry, stubbed accept overlay |
| Testing & CI | **D** | Backend: zero tests. Frontend: 2 tiny test files. No CI, no README |
| Repo hygiene | **C-** | Leftover AI plan files, 4 stale audit reports, 752 KB icon at root, `.gitgnore` typos |

**Bottom line:** This is a far better codebase than most early-stage ride-hailing MVPs — the security posture and the transactional wallet logic show real care. But it is **not launchable yet**: the driver home screen crashes, wallet top-ups can never succeed with real money, the fare-bargaining feature silently does nothing, and banned users can keep riding.

---

## ✅ What's genuinely well done

1. **SQL injection safety — everywhere.** Every query across all 8 route files uses parameterized placeholders (`?` → `$n` conversion in `database.ts`). I found zero string-interpolated user input in SQL.
2. **Real financial transactions.** Settlement, tips, and payouts use `BEGIN/COMMIT/ROLLBACK` with `SELECT … FOR UPDATE` row locks, and the double-settlement guard (`UPDATE rides SET settled = TRUE WHERE id = ? AND settled = FALSE`) is the textbook-correct atomic claim pattern.
3. **Socket.io security is above average.** JWT verified in the handshake middleware; user identity comes from the token, never from client payloads; ride-room joins verify membership against the DB; per-event in-memory rate limits; Uganda bounding-box validation on location updates; broadcasts scoped to `drivers`/`admins` rooms instead of global.
4. **Ride state machine enforced server-side** in *both* the socket handler and the REST fallback (`requested → accepted → arrived → ongoing → completed`), with ownership checks on cancel/tip/rate/history, and PII minimization for drivers browsing open requests (destination hidden from non-participants — nice anti-stalking touch).
5. **Auth hygiene basics:** bcrypt with salt, password policy (8+ chars, letter+number), generic "invalid credentials" errors, account-existence not leaked on forgot-password (mostly — see H9), auth/SMS/payout/ride-request rate limiters, admin auto-creation refuses to run without `ADMIN_PASSWORD`, JWT refuses to boot without a secret.
6. **The fare engine (`fare.ts`)** is thoughtful and well documented: researched Kampala market anchors, no-surge doctrine, round-down-to-100 customer-friendly pricing, commission clamped to 5–20% even if the env var is misconfigured, free first 500 m.
7. **Frontend engineering fundamentals:** route-level lazy loading with Suspense, `ErrorBoundary` wrapping, role-protected routes with role normalization, axios interceptor with 401 auto-logout + redirect-loop guard, a carefully written service worker that does *not* break SPA navigation, config normalization (`VITE_API_URL` with/without `/api`) that even has unit tests, theme system with dark/light support, skip-link for accessibility.
8. **CORS allowlist shared** between REST and Socket.io, `trust proxy` set correctly for Render, DB health check endpoint excluded from rate limiting.

---

## 🔴 CRITICAL — fix before anything else

### C1. Driver Home page crashes at runtime
`frontend/src/pages/driver/DriverHome.tsx:185` renders `<IonToast …/>` **but `IonToast` is never imported** (confirmed by `tsc`: *TS2304 Cannot find name 'IonToast'*). Vite bundles it anyway (treats it as a global), so every driver hitting `/driver/home` gets a `ReferenceError` and the ErrorBoundary screen. The core driver screen of the app is broken.
→ Add `IonToast` to the `@ionic/react` import. Same class of bug: `setVisualScale(1)` in `NavigoMap.tsx:223` — the state setter doesn't exist; map style transitions will throw.

### C2. Wallet top-up can never actually work (it's simulated end-to-end)
- `RiderPayments.tsx` generates a **random client-side reference** (`NAV-${Date.now()}-…`) and posts it to `/wallet/topup` — **no money is ever collected** (no Flutterwave checkout/inline, no MoMo prompt).
- Backend `verifyTransaction()` then calls `GET https://api.flutterwave.com/v3/transactions/verify?id=…` — **that endpoint doesn't exist**; Flutterwave's verify is `GET /v3/transactions/{id}/verify` or `/v3/transactions/verify_by_reference?tx_ref=…`. Even a real payment would fail verification.
- `frontend/src/services/paymentService.ts` (`payWithMTN`/`payWithAirtel`) returns **hard-coded success** with the real API calls commented out, telling users "✅ Payment request sent!" when nothing happened.
- In dev, any reference starting with `TEST_` credits the wallet with a fake 1,000.
→ Pick one gateway (Flutterwave is already half-wired), implement real checkout → webhook/verify → credit, and delete the simulated client-side service.

### C3. Driver payouts use the wrong Flutterwave API (wrong direction!)
`paymentService.requestPayout()` posts to `/v3/collections/collect` — a **collection** endpoint (charging a customer), not a disbursement. Sending money *to* a driver requires `POST /v3/transfers`. With a live key this would attempt to **charge the driver's phone** instead of paying them, or simply fail. The `manual` fallback mode (admin processes payouts by hand) is the only path that currently works — keep that as default until transfers are properly integrated.

### C4. The fare-bargaining feature is a silent no-op — and can corrupt settlement
In `rides.ts /request`, the INSERT writes:
`fareRecommended, fareOffered, fareFinal` ← `[fareRecommended, finalFareOffered, fareRecommended]`
i.e. **`fareFinal` is always set to the recommended fare, ignoring the rider's offer.** Settlement charges `fareFinal`. Consequences:
- The "Adjust Your Offer" UI (RideRequest.tsx) does nothing — a rider who offers 65% of the quote is still charged 100%. That directly contradicts the "nobody gets cheated" doctrine and is a trust/legal problem.
- The wallet pre-check at request time validates balance against `finalFareOffered`, but settlement debits `fareFinal` — a rider can pass the check and then fail settlement (see C5).
→ Decide the product rule: either `fareFinal = fareOffered` (true bargaining) or remove the offer UI. Make the pre-check and settlement use the same number.

### C5. Wallet rides can complete with the driver never paid
In `settleRidePayment()`, if the rider's balance is below the fare at completion time (they tipped mid-ride, topped-down, whatever), the transaction throws, the function returns `{success:false}` — **and nothing else happens**. The ride stays `completed`, `settled=false`, the driver gets nothing, and there is no retry queue, no reconciliation job, no alert, no fallback to "collect cash". Money silently disappears from the ledger.
→ At minimum: flag failed settlements, surface them in the admin panel, add a retry/`mark-paid-in-cash` path, and consider escrowing the fare at ride acceptance instead of at completion.

### C6. Bans and suspensions are decorative
`POST /admin/update-user-status` writes `users.status = 'banned' | 'suspended'` … and **no code anywhere reads it**. Not `login`, not the `authenticate` middleware, not the socket handshake. A banned driver keeps a valid 30-day JWT and keeps accepting rides. Combined with:
- JWT lifetime of **30 days** with the role baked in and **no revocation** (a `sessions` table exists in the schema but is never used),
- role changes/deletions not invalidating tokens,
this means admin moderation has no real effect for up to a month.
→ Check `status` on login AND in `authenticate`/socket middleware (one indexed DB read, or a short-TTL cache), shorten token life, use the sessions table or a token-version column.

### C7. `JWT_SECRET` is read before `.env` is loaded
`utils/auth.ts` captures `process.env.JWT_SECRET` at **module load**, but imports are evaluated before `dotenv.config()` runs in `index.ts`'s body. With secrets only in a `.env` file (typical local/dev setup), the server crashes at boot with "FATAL ERROR: JWT_SECRET … not set" even though it *is* set. It only works today because Render injects env vars directly.
→ Move `dotenv.config()` into a side-effect module imported first (e.g. `import './loadEnv'` at the top of index.ts), or read the secret lazily inside the functions.

### C8. Silent fallback to a fake in-memory DB — in production too
If the PostgreSQL connection fails at boot, `initDB()` **catches the error and swaps in a mock store with demo users**, and the API happily serves requests. In production, a transient DB outage at deploy time means: registrations accepted into RAM and lost, rides written to nowhere, `/api/health` still returning "ok" (the mock answers `SELECT 1`). This is a data-loss machine.
→ Gate the mock behind `NODE_ENV !== 'production'` (or an explicit `USE_MOCK_DB=1`), and make production fail fast / retry with backoff.

### C9. The global driver ride-alert overlay's buttons do nothing
`DriverNotificationContext.tsx` shows `DriverAlertOverlay` on every `ride-requested` event, but `acceptRequest()`/`rejectRequest()` are stubs: `console.log('✅ Driver accepted ride …') // In a real app, we'd call api...`. A driver who taps **Accept** on the overlay just dismisses it. Acceptance only works if the driver happens to be sitting on the `IncomingRequest` page. Two components also both listen to `ride-requested`, so drivers on that page get a double notification path.
→ Wire the overlay to the real `accept-ride` socket flow (or navigate to `/driver/incoming` with the rideId), and de-duplicate the listeners.

### C10. Phone "verification" never happens
Registration sets `phoneVerified: true` unconditionally — no OTP is ever sent or checked (a `PhoneVerification.tsx` page exists but is bypassed). For a Ugandan mobility app where the phone number *is* the identity (and the MoMo payout destination), this invites fake accounts, promo abuse, and payout fraud.

---

## 🟠 HIGH priority

**H1. Ride expiry is never enforced.** `expiresAt` (3 min) is written on every ride and then ignored forever. Stale `requested` rides: (a) block the rider from making any new request ("You already have an active ride"), with cancel as the only escape; (b) remain acceptable by drivers hours later. Add a sweep job or check `expiresAt` in `/active`, `accept-ride`, and the duplicate-request guard.

**H2. There is no actual driver matching.** `request-ride` broadcasts to *every* online driver in the country — no filtering by distance (driver lat/lng is stored but unused), no filtering by vehicle type (a boda driver gets XL requests), no offer/timeout/next-driver cascade. For launch beyond a pilot neighborhood this is the biggest product gap.

**H3. Ride acceptance is optimistic on the frontend.** `IncomingRequest.handleAccept()` emits `accept-ride`, immediately shows "✅ Ride accepted!" and navigates to `/driver/active-ride` — without waiting for server confirmation. When two drivers race, the loser also sees success and lands on an active-ride screen with no ride. Wait for an ack (`socket.emit(..., callback)` or listen for the error event) before navigating.

**H4. Chat is not persisted.** `send-message` only relays via socket. Any reconnect/page refresh wipes the conversation; there's no history for dispute resolution or safety investigations — important for a ride-hailing app.

**H5. Driver earnings are overstated by ~11%.** `drivers.ts /stats` sums `fareFinal` (100%) as "earnings", but drivers only receive 90% (`driverShare`). Drivers will reconcile against their wallet and think they're being robbed. Also "acceptanceRate" is actually *completed ÷ (completed+cancelled)* — a completion rate, not acceptance.

**H6. Top-up double-credit race + missing checks.** The duplicate-reference check runs **outside** the transaction and `wallet_transactions.reference` has no UNIQUE constraint → two concurrent requests with the same reference both credit. Also: when `verification.amount` is undefined the amount check is skipped, and **currency is never verified** (a 1,000 NGN payment would credit 1,000 UGX). Add a UNIQUE index on `reference`, do the insert-first-then-verify pattern, check `currency === 'UGX'`.

**H7. External gateway call inside an open DB transaction.** `/wallet/payout` holds a `FOR UPDATE` lock on the wallet row while awaiting the Flutterwave HTTP call (up to tens of seconds; connection pool starvation under load). If the process dies after the gateway call but before COMMIT, money is sent but the balance is never debited. Pattern should be: debit + mark payout `pending` + COMMIT → call gateway → update status (refund on failure).

**H8. SMS will likely never deliver.** `forgot-password` sends to the local `07XXXXXXXX` format, but Africa's Talking requires international `+2567XXXXXXXX`. You even have `normalizeUgPhone()` producing exactly that format — it's just not used here. Reset codes are also stored in **plaintext** in `password_resets` (hash them like passwords).

**H9. OAuth callback leaks the JWT in the URL.** `/auth/google/callback` redirects with `?token=…&userId=…&role=…` — tokens end up in browser history, proxy logs, and the Vercel edge logs. Prefer a one-time code exchanged via POST, or at least `#fragment` transport. Minor extras: the Google scope `'phone'` isn't a valid Google OAuth scope; `failureRedirect: '/login'` points at the API host, not the frontend.

**H10. No DB indexes beyond primary keys.** Hot queries — `rides(userId, status)`, `rides(driverId, status)`, `rides(requestedAt)`, `wallet_transactions(userId, createdAt)`, `users(role, isOnline, isAvailable)`, `wallet_transactions(reference)` — will all become sequential scans as data grows. Ride history also has **no pagination** (returns every ride a user ever took).

**H11. Missing standard hardening.** No `helmet` (no security headers at all), `express.json({limit:'10mb'})` globally (DoS surface; only the docs upload needs size), driver documents stored as **base64 strings in the users table** (DB bloat, 10 MB rows, no object storage, no content validation — these are supposedly national IDs and licenses, i.e. sensitive PII in a TEXT column).

**H12. CORS wide-open by default.** If `ALLOWED_ORIGINS` is unset, every origin is allowed **with credentials**. Default should be deny (or localhost-only outside production).

**H13. Rate limits will bite real Ugandan users.** Login/register share 15 attempts/hour **per IP** — mobile carriers there use CGNAT, so one IP = thousands of users; whole towns can get locked out (and the SMS limiter at 5/day/IP has the same issue). Key limiters by identifier+IP, not IP alone. (Also `generalLimiter`'s comment says 100 but the code says 150 — trivial, but says drift.)

---

## 🟡 MEDIUM

1. **Hard-deleting users destroys financial records.** `DELETE /admin/user/:id` cascades into wallets/transactions and nulls rides' driverId. Soft-delete (`status='deleted'`) and keep the ledger immutable — you'll need it for taxes and disputes.
2. **Frontend type-check failures (8 errors) with no gate.** `npm run build` is just `vite build` — it shipped the `IonToast` crash. Make the build `tsc && vite build` and add CI. The other errors: `Home.tsx` reads `.price`/`.eta` on objects that don't define them (renders `undefined`), `RideRequest.tsx:670` compares `string|number > number`, `NavigoMap` passes `'terrain'` into a `'standard'|'satellite'` union.
3. **The map is a Google Maps embed hack.** `NavigoMap` renders `maps.google.com/maps?...&output=embed` iframes (no API key, against Google ToS, no control over markers/tiles) mixed with Leaflet in the same component. Pick one: Leaflet+OSM (free, already a dependency) or the official Google Maps JS SDK.
4. **Legacy route double-mounting** (`/api/auth/admin/payouts` and `/api/admin/analytics` both mount the whole admin router) — works, but creates ghost endpoints like `/api/auth/admin/payouts/summary`. Fix the two frontend callers and delete the shims.
5. **Role naming chaos:** `rider`/`customer`/`driver`/`motorist` are normalized ad-hoc in at least 6 places (frontend route guard, backend queries with `role IN (…)` pairs). One canonical enum + a migration would eliminate a whole bug class.
6. **"Session timeout" in AuthContext is cosmetic.** It clears React state after 30 min idle, but the 30-day JWT stays in localStorage, and logout never invalidates server-side. Also token in `localStorage` is XSS-exfiltratable (acceptable MVP trade-off, but know it).
7. **Admin bootstrap details:** falls back to phone `0770000000`, logs the generated admin phone; `/_dev/users` endpoint still exists (admin-gated, but it's dead weight in production).
8. **`register` error path leaks DB internals** (`detail: dbError.detail, error: dbError.message` sent to the client regardless of NODE_ENV in the insert catch-block).
9. **Support tickets:** users can create tickets but there's **no user-facing endpoint to read their own tickets/replies** — only admins can list. Riders never see the admin's answer in-app.
10. **`notifyRide` triple-emits** (ride room + both personal rooms) — participants who joined the ride room receive every event 2×. Frontend handlers must all be idempotent; de-duplicate server-side instead.

---

## ⚪ LOW / hygiene

- **Repo clutter:** `CUsersWILBER.claudeplans*.md` (3 leftover AI planning files, one inside `frontend/`), four stale audit reports (`AUDIT_REPORT.md`, `AUDIT_REPORT_V2.md`, `DARK_LIGHT_AUDIT.md`, `DESIGN_AUDIT.md`), `MEMORY.md` pointing at files that don't exist, a **752 KB** `icon-512x512.png` at repo root, a `screenshots/` folder, and a root `package.json` whose only dependency is a stray `socket.io-client`.
- **Typo'd ignore files:** both `backend/.gitgnore` and `frontend/.gitgnore` exist alongside the real `.gitignore`s — delete them.
- **No README** — zero setup/run/env documentation for a 2-person-plus project. No `backend/.env.example` (frontend has one).
- **Tests:** backend `npm test` is literally `exit 1`; frontend has only `config.test.ts` + a trivial `App.test.tsx`; the Cypress specs are design-review scaffolding. The money paths (settlement, clampOffer, topup dedup) are exactly the kind of pure logic that's cheap to unit-test.
- **33 `console.log`s** across src (several logging user IDs/locations) — swap for the `winston` logger that's already in backend deps but never imported.
- `ssl: { rejectUnauthorized: false }` for production PG — fine for Render's internal URL, but prefer the CA-verified connection string.
- Duplicated phone normalizers (`auth.ts`, `wallet.ts`, `uganda.ts` — three implementations, two formats).
- `main.tsx`/`sw.js`: service worker caches are fine, but bump `CACHE_NAME` on deploys is manual — consider build-hash versioning.

---

## Suggested fix order (pragmatic roadmap)

**Week 1 — stop the bleeding (small diffs, huge impact):**
1. Import `IonToast` in DriverHome; fix `setVisualScale` + the other 6 TS errors; make build run `tsc` (C1, M2)
2. Fix `fareFinal` to honor the clamped offer; align wallet pre-check with settlement (C4)
3. Enforce `users.status` in login + `authenticate` + socket handshake (C6)
4. Fix dotenv load order (C7); gate mock DB out of production (C8)
5. Wire DriverAlertOverlay accept/reject to the real socket flow (C9)
6. Enforce `expiresAt` in accept/active/duplicate-check (H1)
7. Use `normalizeUgPhone` (+256) for Africa's Talking; hash reset codes (H8)

**Week 2–3 — money correctness:**
8. Real Flutterwave top-up: hosted checkout → webhook → verify (`/v3/transactions/{id}/verify`, currency check) → credit; UNIQUE on `reference`; delete the simulated frontend payment service (C2, H6)
9. Switch payouts to `/v3/transfers` or lock to manual-admin mode; move gateway call outside the DB transaction (C3, H7)
10. Failed-settlement handling: flag, admin surface, retry/cash-fallback (C5)
11. Fix driver earnings to 90% share; rename "acceptance rate" (H5)
12. Add the missing indexes + pagination (H10)

**Month 1–2 — product completeness:**
13. Real OTP phone verification (C10)
14. Proximity + vehicle-type driver matching with offer cascade; server-acked acceptance (H2, H3)
15. Persist chat; user-visible support ticket thread (H4, M9)
16. helmet, CORS deny-by-default, scoped body limits, move driver docs to object storage (H11, H12)
17. Tests for fare/settlement/topup + CI; README + .env.example; repo cleanup

---
*Compiled from full source review of 19 backend TS files (~3.4 k LOC) and ~11 k LOC of frontend, plus `tsc` runs and a production Vite build. Line references are to the current branch head.*
