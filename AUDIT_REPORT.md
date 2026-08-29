# NAVIGO Comprehensive App Audit — Open to Close

**Audit date:** 2026-08-29 (Africa/Kampala)
**Branch:** `arena/01a04cd2-navigo`
**Audited commit:** `a7fd6b70dde59903a1f3c723ed365d75f96634a3` (`fix: correct JSX closing tags in AdminAnalytics.tsx`)
**Scope:** frontend, backend, routes, user journeys, design, responsive behavior, accessibility, performance, payments, maps, realtime, safety, data contracts, deployment readiness, and available tests.

> **Important:** This report replaces the previous stale audit. The prior report referred to another branch and described fixes that are not part of this checkout. No application source files were changed during this audit; this report is the deliverable.

---

## 1. Executive verdict

## **NO-GO for production or a real-money pilot**

NAVIGO has a promising visual identity and a broad product surface: customer booking, delivery, driver operations, admin tooling, maps, USSD messaging, wallet concepts, ratings, chat, SOS, onboarding, and PWA packaging. The strongest part of the product is the **concept and presentation layer**.

The current implementation is not yet operationally trustworthy. The release is blocked by a combination of:

1. **The backend cannot compile and cannot start in the audited environment.** `JWT_SECRET` is evaluated before `dotenv.config()` can run, and the TypeScript build has 36 diagnostics.
2. **The frontend build succeeds only because Vite transpiles without type-checking.** The frontend has 16 current TypeScript diagnostics and 399 ESLint errors.
3. **The money path is not a working end-to-end contract.** The booking screen always sends `paymentMethod: 'cash'`; the top-up screen fabricates a payment reference without initiating a gateway payment; wallets are not created at registration; the tip endpoint is missing; and payout admin routes are missing.
4. **Core fare and booking values are client-influenced.** The server accepts client-supplied distance, duration, coordinates, and offer values without sufficient validation, and delivery fees are omitted from the request-side server calculation.
5. **Driver matching is unsafe and incomplete.** The server broadcasts ride requests to every socket, does not filter the emitted event by eligible driver, and the normal driver online flow never sets `isAvailable = TRUE`.
6. **Authentication/verification contains bypasses and broken OAuth hydration.** Phone verification accepts any six-digit value, `/verify-phone` is wired to a redirect placeholder, Google existing-user login saves only a token, and social registration calls a non-existent context method at runtime.
7. **Sensitive driver documents have an IDOR and response-exposure risk.** `/auth/upload-documents` is unauthenticated, trusts a client-supplied `userId`, and returns the full database user object, including the password hash.
8. **Realtime safety/privacy is not production-safe.** Location updates are not tied to ride membership, admin location updates are emitted to every connected socket, chat messages are not persisted, and the UI claims “secure and encrypted” without an implemented message-history/read/typing protocol.
9. **Several pages are still explicitly mock/local-only.** Driver home/profile figures, customer payment figures, loyalty/rewards, admin analytics, admin settings, and the legacy admin review screen can display or mutate values that are not backed by the API.
10. **Runtime smoke testing remains incomplete.** PostgreSQL, gateway/SMS/email credentials, and deployment configuration were unavailable, so no real registration, payment, socket, device GPS, or browser/device journey could be certified.

### What is good

- The product has a clear Kampala/Uganda positioning and a recognizable ember/orange brand system.
- The landing, auth, customer, driver, and admin screens are visually ambitious and mostly coherent in their dark/glass style.
- Ionic provides a useful mobile foundation, and local Inter/Sora font assets avoid a font CDN dependency.
- There are good defensive intentions: route error boundaries, API timeouts, loading/empty states, normalized API/socket URLs, rate limiters, JWT middleware, SQL foreign keys, and transaction wrappers.
- The server has the beginnings of a sound ride state machine and settlement model, but those pieces need to be made executable, authoritative, and fully tested before they can be called production-ready.

---

## 2. Validation baseline

All commands below were run against this checkout. A successful Vite build is **not** treated as a successful TypeScript or runtime validation.

| Check | Result | Meaning |
|---|---|---|
| `frontend/npm run build` | **PASS** | Production bundle emitted, but with repeated Ionic LightningCSS warnings and a large-chunk warning. |
| `frontend/npx tsc --noEmit` | **FAIL — 16 diagnostics** | The frontend is not type-safe. |
| `frontend/npm run lint` | **FAIL — 418 problems** | 399 errors and 19 warnings; not currently a usable quality gate. |
| `frontend/npm run test.unit -- --run` | **PASS — 2 files, 6 tests** | Only the current unit tests pass; coverage is very small. |
| `backend/npm run build` / `npx tsc` | **FAIL — 36 top-level diagnostics** | Widespread Express request typing failures, a bad `pg` query call, implicit `any`s, and missing `nodemailer` declarations. |
| `backend/npm start` without environment | **FAIL immediately** | Throws `FATAL ERROR: JWT_SECRET environment variable is not set` from `backend/src/utils/auth.ts` before the server starts. |
| Browser/device/API smoke | **NOT RUN** | Requires PostgreSQL, secrets, gateway/SMS/email providers, and a configured deployment/API origin. |

### Frontend type errors currently reported

- `frontend/src/components/LoyaltyCard.tsx`: `User.rideHistoryLength` does not exist (two sites).
- `frontend/src/components/NavigoMap.tsx`: incompatible `L.control` call.
- `frontend/src/components/ProtectedRoute.tsx`: unsupported `motorist` role comparison.
- `frontend/src/context/DriverNotificationContext.tsx`: unsupported `motorist` role comparison and implicit `any` event data.
- `frontend/src/pages/admin/AdminDashboard.tsx`: `avgRating` does not exist on the local stats type.
- `frontend/src/pages/admin/AdminLiveMap.tsx`: implicit `any` callback parameters.
- `frontend/src/pages/admin/AdminUsers.tsx`: `User.name` does not exist.
- `frontend/src/pages/driver/DriverHome.tsx`: `UseIonRouterResult.replace` does not exist.
- `frontend/src/pages/rider/ActiveRide.tsx`: missing `navigateOutline` and missing `handleRate`.
- `frontend/src/pages/rider/RideRequest.tsx`: possibly undefined place name and an unassignable vehicle-type string.

### Backend type failure themes

- `AuthRequest.user` is declared as `{ userId, role }`, while the installed Express 5 type declaration already exposes a different `Request.user` shape. This breaks middleware compatibility across `auth`, `drivers`, `rides`, `support`, `users`, and `wallet` routes.
- `backend/src/routes/auth.ts:482` uses a three-argument callback with the PostgreSQL wrapper even though the wrapper exposes a promise API; callback parameters are also implicit `any`.
- `backend/src/services/notificationService.ts` imports `nodemailer` without `@types/nodemailer`.

### Build/performance evidence

- The modern main bundle is approximately **1.89 MB minified / 443 KB gzip** (`index-BIHeubsl.js` in the latest build). The legacy output is larger. Vite recommends code splitting.
- The build repeatedly warns that Ionic `:host-context` selectors are not recognized by LightningCSS. The build still completes, but the warning should be verified visually on every supported browser.
- `frontend/src/main.tsx` registers a service worker and `frontend/index.html` runs a document-wide `MutationObserver` to repeatedly rewrite all Ionic headers. Both need production profiling.

---

## 3. Scope and method

The audit followed each available role from opening the app through the main completion/exit paths:

- Public visitor: landing → explore/pricing → sign in/register → USSD.
- Customer/rider: login → dashboard → location search → vehicle/fare → booking/matching → active ride → completion/rating/tip → history/wallet/places/profile/support.
- Driver/motorist: registration → documents → approval → online state → incoming request → active trip → earnings/payouts → vehicle.
- Admin: dashboard → approvals → users → live map → analytics → payouts → support → settings.
- Shared infrastructure: auth hydration, API errors, socket authorization, maps/geocoding/routing, SOS, chat, service worker, responsive CSS, and package/deployment configuration.

Findings are separated into:

- **Confirmed:** directly visible in source or reproduced by a command.
- **Runtime-dependent:** likely or high-risk, but requiring a working database/provider/browser to prove.
- **Recommendation:** an improvement rather than a demonstrated defect.

Line references are based on the audited tree and may move after edits.

---

## 4. Route and page inventory

### Public/auth routes

| Route | Component/behavior | Assessment |
|---|---|---|
| `/` | `frontend/src/pages/auth/Home.tsx` | Strong marketing entry point; no catch-all/404 route exists for unknown paths. |
| `/login` | `Login.tsx` | Good basic form and guest/USSD links; error handling is overly generic and OAuth is incomplete. |
| `/register` | `Register.tsx` | Good role/password form; registration creates a session then immediately navigates back to login. |
| `/forgot-password` | `ForgotPassword.tsx` | UI exists; SMS/email delivery and password policy need hardening. |
| `/verify-phone` | `SkipVerification` in `App.tsx` | **Not verification.** It calls `HomeRedirect`; `PhoneVerification.tsx` is not routed. |
| `/explore` | `RideRequest.tsx` | Public booking UI; booking correctly prompts for authentication before submission, but it still starts protected data calls as a guest. |
| `/ussd` | `USSDInfo.tsx` | Useful offline information; the actual USSD provider flow is not implemented in this repository. |
| `/auth/callback` | `AuthCallback.tsx` | Token-only existing-user path does not hydrate a user into `AuthContext`. |
| `/auth/complete-social-reg` | `CompleteSocialRegistration.tsx` | Calls `saveSession`, which is not exposed by `AuthContext`; runtime failure is expected. |
| `/terms`, `/privacy` | Linked from registration but not defined in `App.tsx` | Broken/blank navigation path; legal documents are missing. |

### Customer routes

| Route | Component | Assessment |
|---|---|---|
| `/customer/home` | `CustomerDashboard.tsx` | Good shell and useful quick actions; rewards/profile figures are partly fabricated/local. |
| `/customer/book` | `RideRequest.tsx` | Main booking path; fare, payment, delivery, geocoding, and socket contracts need correction. |
| `/customer/active-ride` | `ActiveRide.tsx` | Intended to be real-time; currently has compile errors, missing tip API, and incomplete tracking recovery. |
| `/customer/history` | `CustomerRideHistory.tsx` | API-backed list but data naming is inconsistent and error state can look like an empty account. |
| `/customer/places` | `CustomerSavedPlaces.tsx` | API-backed with ownership checks; uses a public geocoder directly and lacks robust input/bounds validation. |
| `/customer/payments` | `RiderPayments.tsx` | Canonical wallet screen, but normal top-up cannot complete with the current booking/payment design. |
| `/customer/support` | `CustomerSupport.tsx` | FAQ and contact cards are useful; “Submit Ticket” only creates a random local toast and does not call `/api/support`. |
| `CustomerPayments.tsx` | Imported in `App.tsx` but not routed | Duplicate legacy payment page with hardcoded balance, transactions, and saved methods. |

The customer route guard allows `['rider', 'customer']`, while `AuthContext.User.role` only permits `'rider' | 'driver' | 'admin'`, and backend registration only accepts `rider` or `driver`. The `customer` role is therefore unsupported and should either be removed or implemented consistently.

### Driver routes

| Route | Component | Assessment |
|---|---|---|
| `/driver/home` | `DriverHome.tsx` | Online toggle is API-backed, but KPI/activity figures are hardcoded and `replace` causes a type error. |
| `/driver/requests` | `IncomingRequest.tsx` | Request UI works conceptually; delivery/request filtering and eligibility are not secure server contracts. |
| `/driver/active-ride` | `DriverActiveRide.tsx` | Good intended lifecycle and GPS sharing; status acknowledgement and completion settlement are unsafe/incomplete. |
| `/driver/earnings` | `DriverEarnings.tsx` | Reads wallet/profile APIs, but payout action is disabled and history uses a restricted/incomplete transaction type. |
| `/driver/vehicle` | `DriverVehicle.tsx` | Entirely local state; edits disappear on reload and documents are decorative. |
| `/driver/documents` | `DriverDocuments.tsx` | Submission UI calls an API, but photo uploads are explicitly “Coming soon” and endpoint security is critical. |
| `motorist` role | Referenced in route guards, socket code, and admin views | Not supported by frontend user type or public registration; role model must be unified. |

### Admin routes

| Route | Component | Assessment |
|---|---|---|
| `/admin/dashboard` | `AdminDashboard.tsx` | Some KPIs are API-backed; alerts, daily revenue chart, and some metrics are static. |
| `/admin/home` | Redirect to dashboard | Fine compatibility alias. |
| `/admin/approvals` | `AdminApprovals.tsx` | API-backed approval list with document data; requires minimization, audit logs, and careful status rules. |
| `/admin/users` | `AdminUsers.tsx` | API-backed management; delete/suspend actions need confirmation, audit trail, pagination, and server-side safeguards. |
| `/admin/map` | `AdminLiveMap.tsx` | API/socket map, but active trips are hardcoded to 0 and demand heatmap is static. |
| `/admin/analytics` | `AdminAnalytics.tsx` | Calls three endpoints that do not exist in the backend route inventory; falls into an empty/zero state. |
| `/admin/payouts` | `AdminPayouts.tsx` | Calls `/auth/admin/payouts` and `/auth/admin/payouts/:id/complete`, which are not implemented. |
| `/admin/approve` | `AdminUserReview.tsx` | Legacy duplicate screen using four hardcoded mock drivers and Mongo-style `_id/name` data. Dashboard “Disputes” points here. |
| `/admin/support` | `AdminSupport.tsx` | API-backed queue/reply/resolve flow; user-facing ticket creation currently does not feed it. |
| `/admin/settings` | `AdminSettings.tsx` | Entirely local state; “Save” only shows a toast and fare settings do not affect `fare.ts`. |

**Routing recommendation:** define a single canonical role vocabulary and data contract, add an explicit 404/not-found screen, remove or clearly label legacy routes, and add route-level lazy loading.

---

## 5. Critical launch blockers (P0)

P0 means the issue can cause an outage, unauthorized access, incorrect money movement, unsafe operations, or a materially false user promise.

| ID | Finding and evidence | Required acceptance criterion |
|---|---|---|
| **P0-01** | **Backend startup/environment ordering.** `backend/src/index.ts` imports routes before `dotenv.config()`; `backend/src/utils/auth.ts:4-7` throws at module evaluation when `JWT_SECRET` is absent. Reproduced with `npm start`. | Load and validate environment before importing modules that require secrets, fail with a structured startup report, and start only with secure production configuration. |
| **P0-02** | **Both TypeScript gates fail.** Frontend has 16 diagnostics; backend has 36. | CI must run frontend typecheck/lint, backend build, unit tests, and API/integration tests; no release on compile errors. |
| **P0-03** | **Wallet rows are not created transactionally.** Registration inserts `users` only (`backend/src/routes/auth.ts:116-120`). `wallets` has a user FK but no registration insert. `/wallet/topup` updates a possibly nonexistent row and can still insert a ledger entry/success response. | Registration creates wallet/driver profile atomically where needed; top-up requires an affected wallet row and has reconciliation tests. |
| **P0-04** | **Payment initiation is absent/fabricated.** `RiderPayments.tsx:69-85` creates a local `NAV-...` reference and sends it directly to verification. `paymentService.ts` only accepts real gateway verification or a `TEST_` development reference. No checkout initiation, callback/webhook, or gateway transaction ownership exists. | Implement provider checkout/collection initiation, server-generated idempotency key, signed webhook/callback handling, verification by provider transaction, currency/amount/merchant checks, retry/reconciliation, and refund policy. |
| **P0-05** | **Booking payment is hardcoded to cash.** `RideRequest.tsx:419-430` always posts `paymentMethod: 'cash'`; wallet is displayed but not selectable. | Customer selects an available method; server stores and enforces it; payment state is explicit (`pending/authorized/paid/failed/refunded`). |
| **P0-06** | **Fare authority and delivery fee mismatch.** `rides.ts:50-75` calculates from client `distanceKm/durationMin`, calls `fareQuote` without `serviceType`, and stores `fareFinal = fareRecommended` despite `fareOffered`. Frontend hardcodes a different vehicle table/surge model. | Server derives/validates route distance and duration, passes delivery type to one shared fare engine, persists a fare version/breakdown, and rejects tampered coordinates/values. |
| **P0-07** | **Driver matching is not targeted or fully eligible.** `socketHandler.ts:96-109` queries eligible drivers but uses `io.emit('ride-requested')`, sending the event to all sockets. It also does not check vehicle compatibility, current ride, or request expiration. | Emit only to eligible driver rooms, enforce approved/online/available/vehicle rules server-side, expire requests, and test concurrent acceptance with one winner. |
| **P0-08** | **Online flow never sets availability.** `DriverHome.tsx` posts `/drivers/status/online`; `drivers.ts` updates `isOnline`, while matching requires both `isOnline = TRUE AND isAvailable = TRUE`. No normal UI path sets availability true. | Define online/available semantics, update them atomically, and make the driver visibly receive a test request after going online. |
| **P0-09** | **Document upload IDOR and password-hash exposure.** `auth.ts:238-286` is unauthenticated, trusts `req.body.userId`, allows a caller to submit for another driver, and returns `{ ...user }` from `SELECT *`, including `password`. | Authenticate; use token subject, not client user ID; validate role/status; store files privately; return a sanitized DTO; add authorization and data-leak tests. |
| **P0-10** | **Phone verification is bypassed.** `PhoneVerification.tsx` comments out the API and accepts any six-digit code. `/verify-phone` maps to `SkipVerification` rather than the component. Registration marks users `phoneVerified: true` immediately. | Implement OTP issue/verify/resend with expiry, attempt limits, provider failure handling, one-time use, and a real route; do not mark verified before verification. |
| **P0-11** | **OAuth session hydration is broken and insecurely transported.** Existing Google callback puts a JWT in a query string; `AuthCallback` saves only the token and never fetches the user. New social registration calls a missing `saveSession` method. | Use state/PKCE or a server-side exchange, never expose long-lived tokens in URLs, hydrate `/auth/me`, and test existing/new/error/cancelled OAuth paths. |
| **P0-12** | **Active ride has compile/runtime contract failures.** `ActiveRide.tsx` references missing `navigateOutline`/`handleRate`; it posts to missing `/rides/:rideId/tip`. Settlement failures after completion are logged while ride status remains completed. | Compile cleanly; implement tip authorization/debit/ledger; make status and settlement transactional or recoverable with an outbox/retry/reconciliation state. |
| **P0-13** | **Safety promise is false.** `SOSButton.tsx:52-61` builds `msg` but never sends it; it only opens a phone URI and then claims “Alert sent”/“Help is on the way.” No incident endpoint, contact notification, location-sharing audit, or NAVIGO escalation exists. | Implement a real SOS incident record, emergency call handoff, SMS/push/contact escalation where permitted, location payload, cancellation/acknowledgement, operator view, and truthful copy if a channel fails. |
| **P0-14** | **Realtime location privacy/authorization.** `socketHandler.ts:165-186` checks only that the client-supplied `userId` equals the authenticated socket user; it does not verify ride membership/driver assignment. It then calls `io.emit('admin-location-updated')`, exposing coordinates to every connected client. | Authorize by database relationship and active ride; send admin events only to authenticated admin rooms; redact/expire location data and test cross-user attempts. |

Until P0 items are resolved, a production launch would risk failed bookings, incorrect balances, unauthorized document access, unsafe emergency messaging, and privacy incidents.

---

## 6. Customer journey: open → close

### 6.1 Open and landing page

**What works well**

- `Home.tsx` has a clear “Move Smart. Pay Less. Arrive Safe.” proposition, a strong primary CTA, ride-type preview, USSD callout, safety/rewards sections, and a recognizable local-market voice.
- Local vehicle artwork and bundled fonts make the hero more reliable than a fully CDN-dependent design.
- The mobile menu has an outside-click close handler (`Home.tsx:26-37`), and links close the menu after navigation.
- Pricing is easy to scan and the landing screen gives a visitor a reason to continue without immediately requiring credentials.

**What needs changing**

- The page claims “Uganda's #1 Ride-Hailing App”, “4-min pickups”, “verified captains”, and other measurable promises without a visible source or live data. Use substantiated claims or label them as targets.
- The hero fallback is an external Unsplash image (`Home.tsx:18`) and the rest of the hero/media strategy should have a local optimized fallback for low-connectivity Uganda networks.
- The landing preview prices are static marketing values and do not represent a quote for a real route. Label them “from” prices and route visitors to a live quote.
- The navigation uses clickable `div`s for Explore, Sign In, theme toggle, and mobile menu. Use buttons/links with focus styles, keyboard activation, accessible names, and current-state semantics.
- Terms and Privacy links from registration have no routes. Legal consent must link to real, versioned documents and record the accepted version.
- Theme switching exists, but `index.html` declares dark color scheme and many page styles use hardcoded colors; a light theme is not a complete supported theme.

### 6.2 Register

**Good**

- Rider/driver choice is prominent.
- Phone normalization on the client and server is a good local-market detail.
- Password visibility, strength feedback, confirmation, Terms checkbox, and driver-specific explanation are useful.

**Defects and risks**

- Frontend requires six characters (`Register.tsx:66-68`); backend accepts four (`auth.ts:76-78`). Use one server-defined policy.
- Registration marks `phoneVerified: true` (`auth.ts:111`) and routes `/verify-phone` to a placeholder. This defeats the security story.
- `AuthContext.register` saves a session, then `Register.tsx:73-74` pushes to `/login`, producing a confusing double-auth flow and leaving a valid token in storage while showing login.
- Driver registration does not create a wallet/profile until later documents; rider wallet creation is absent altogether.
- `isFemaleDriver` is sent by the document UI but is not destructured or persisted in `auth.ts:240`.
- The Terms/Privacy URLs are dead. The “Already have an account” inline style has a malformed CSS variable string (`Register.tsx:245`), a small but visible polish defect.
- Error messages use a checkmark icon for failure (`Register.tsx:214-217`), which is semantically confusing.

**Acceptance flow**

`register → OTP → session/me hydration → role-specific onboarding → dashboard` must be tested with duplicate phone/email, invalid role, weak password, provider failure, refresh, back navigation, and network interruption.

### 6.3 Login, guest, reset, and social auth

**Positive**

- Phone/email switch, password reveal, remember-me UI, guest exploration, forgot-password link, and USSD fallback are well placed.
- The API URL normalization tests protect against the common `/api/api` regression.

**Defects**

- `Login.tsx:48-50` discards the API’s useful message and always shows a phone/email-specific error, even for a wrong password, server outage, suspended user, or invalid email.
- `rememberMe` only sets a local flag; storage/expiry behavior is not actually different.
- `AuthContext` stores bearer tokens and user data in `localStorage`. This is vulnerable to token theft if any XSS is introduced; plan for short-lived access tokens and refresh-token rotation in secure cookies or a carefully threat-modeled mobile storage layer.
- Session restoration (`AuthContext.tsx:75-96`) leaves a locally cached user authenticated when `/auth/me` fails. A token that is invalid, revoked, or associated with a changed role can remain usable until a later API failure.
- The JWT is valid for 30 days, but the “30-minute inactivity” timer only runs while the in-memory user exists and is not a server-side revocation/session policy. The `sessions` table is never used.
- `api.ts:31-34` calls `localStorage.clear()` on a 401, deleting unrelated app data and potentially the guest/onboarding/theme state. Clear only NAVIGO keys and coordinate logout/socket shutdown.
- Google is optional at server startup, but the login button remains visible and can redirect to a disabled route without a user-facing explanation.
- Existing Google callback uses a token in the URL and only writes `navigo_token`; `ProtectedContent` requires both an authenticated user and `user`, so this route will normally redirect to login.
- `CompleteSocialRegistration.tsx:13` accesses a missing `saveSession`; this is a confirmed runtime defect.
- Password reset has a 4-character UI/backend policy inconsistency, no new-password validation on the backend, no attempt counter/lockout, and delivery may return a normal response even when SMS/email credentials are absent.

### 6.4 Customer dashboard

**Good**

- The page hierarchy is sensible: request ride first, real-ish stats, quick actions, rewards, popular destinations.
- It includes loading and empty states and does not block the whole UI while all data loads.
- `SafeRender`, `ErrorBoundary`, and an explicit no-user fallback show good defensive intent.

**Defects**

- `LoyaltyCard` is passed `points={280}` and `tier="silver"`; `Profile.tsx:56-60` also shows static 45 rides, 4.8 rating, and 280 points. These are not trustworthy account data.
- `LoyaltyCard` references a nonexistent `rideHistoryLength` property and uses localStorage to award/redeem points. Users can alter points, referrals, redemptions, and challenge completion from DevTools.
- Popular destination clicks only navigate to `/customer/book`; they do not carry the chosen destination into booking.
- The dashboard’s “Gateway not configured” message is useful for diagnosis but should not be exposed as a normal customer experience in production.
- API failures are mostly rendered as zeros or empty states rather than a retryable, distinguishable error state.

### 6.5 Booking and delivery

**Good**

- The multi-step structure is easy to understand: route → vehicle → payment/details → matching.
- Vehicle selection, route preview, destination search, map click, saved/recent concepts, delivery receiver fields, fare summary, offer adjustment, and cancellation are appropriate product primitives.
- The UI tries to fail gracefully when GPS, routing, or the backend is unavailable.

**Confirmed/high-risk defects**

- The frontend vehicle table (`RideRequest.tsx:31-35`) does not match `backend/src/utils/fare.ts`. It includes different base/per-km/per-minute values and client surge multipliers while the backend doctrine says no surge. Customers see one price model and the server uses another.
- The frontend calls `/rides/quote` with vehicle type `go` while server normalization handles `go → economy`; this needs one shared typed model rather than parallel tables.
- The quote response is treated as a total, but the UI fills `distanceFare`, `timeFare`, and `surgeFare` with zero. A customer cannot audit the amount.
- Promo codes `NAVIGO50` and `FIRSTRIDE` are implemented in `applyPromo` locally. They are not authenticated, persisted, server-validated, usage-limited, date-limited, or reflected safely in final server billing.
- The fare offer decrement can go below sane values before the server clamps it; server response does not clearly return the accepted offer/final price to the user.
- Booking posts `paymentMethod: 'cash'` regardless of wallet balance or customer intent.
- Delivery fields are only required in the UI. The backend does not validate receiver phone format, package length, or the delivery-specific fee. `fareQuote` is called without `serviceType`, so delivery handling fees in `fare.ts` are omitted.
- Client-provided coordinates, distance, duration, service type, vehicle type, and fare offer are not sufficiently validated. A server authoritative route/fare calculation is mandatory.
- `RideRequest` starts wallet/recent ride API calls on `/explore` even for guests, generating avoidable 401s and log noise.
- A 150 ms search delay is not enough throttling. Requests are not aborted when a newer query wins, so stale responses can overwrite current search results.
- Direct browser calls go to Nominatim, Overpass, Photon, and OSRM. This exposes users to provider CORS/rate limits/availability, sends location data to third parties without a product privacy boundary, and makes latency unpredictable.
- The map GPS watch reverse-geocodes each incoming position in the callback. This can create a burst of expensive external calls and should be throttled to meaningful movement/time intervals.

**Required acceptance flow**

Select pickup/destination → server quote with route ID/version → select vehicle → select cash/wallet/provider → apply server promo → confirm with idempotency key → request expires/driver matching → cancellation/refund rules are visible. Test offline, GPS denied, provider timeout, duplicate tap, back/forward navigation, two active bookings, and app reload during matching.

### 6.6 Matching and active ride

**Good**

- Customer and driver active screens share a clear phase vocabulary: requested/accepted/arrived/ongoing/completed/cancelled.
- Maps, driver/rider cards, call/chat affordances, cancellation, status toasts, and SOS placement are the right UX components.
- The server uses a conditional update (`WHERE status = 'requested'`) for acceptance, which is a good starting point for a single-winner race.

**Defects**

- Socket connection is global and also opened directly by `ChatBox` and `AdminLiveMap`; there is no unified lifecycle, no token refresh, and `AuthContext.logout()` does not call `socketService.disconnect()`.
- `socketHandler.ts:103` broadcasts every ride request through `io.emit`, so non-eligible drivers and all other sockets receive it. `IncomingRequest` also accepts a request based on a client-provided ride/rider payload.
- `accept-ride` checks driver role and socket ID, but not approved status, online/available state, active ride conflict, vehicle compatibility, or request expiry. The `riderId` supplied by the client is ignored, which is good; eligibility still needs to be derived server-side.
- There is no server endpoint/event for driver decline, timeout, retry/fan-out strategy, or notification acknowledgement.
- Driver status updates optimistically change the UI before server acknowledgement (`DriverActiveRide.tsx:134-145`). A failed transition can leave the app showing a false state.
- Completion sets ride status first and then calls settlement. If settlement fails, the ride is still completed and the customer/driver have no retry/reconciliation path.
- Customer status/location listeners are not enough for reload/reconnect recovery. The app should re-fetch active ride state after reconnect and use sequence/version numbers to avoid stale events.
- Customer active ride has missing compile symbols and calls a missing tip endpoint.

### 6.7 Completion, rating, tips, history

**Good**

- Server-side rating validation accepts only integer 1–5 and checks rider ownership/completed status.
- Driver rolling rating and rating count are stored in `driver_profiles`.
- History has search, status filters, summary cards, detail modal, and “Book Similar Ride.”

**Defects**

- `ActiveRide.tsx` renders a rating flow but has no `handleRate` implementation in the current file, so the intended submission path cannot compile.
- Tips are offered while a ride is `ongoing`, but `/rides/:rideId/tip` is absent from `rides.ts`. There is no wallet debit, tip idempotency, or 100%-to-driver ledger contract.
- History uses `fare` in the frontend while the database uses `fareFinal`; the route returns `SELECT r.*` and aliases `driverRating` from `verificationStatus`, not an actual rating. Data labels should be typed and normalized at the API boundary.
- Ride detail displays “Distance N/A” despite `distanceKm` existing.
- Rating can be submitted repeatedly; there is no unique/overwrite policy or protection against multiple rating-count increments.
- There is no customer receipt/invoice, fare breakdown, refund status, cancellation fee line, or exportable transaction record.

### 6.8 Wallet and payments

**Good**

- `RiderPayments.tsx` has a proper loading state, balance, transaction list, top-up modal, and a server verification call.
- The database includes wallets, wallet transactions, payouts, and foreign keys.
- Settlement uses transaction clients and an atomic `settled = FALSE` claim, which is a useful foundation.

**Confirmed defects**

- No wallet is created at registration; see P0-03.
- Top-up requires a payment reference but no screen actually creates a provider transaction. A normal generated `NAV-...` reference cannot be verified.
- Top-up does not robustly parse/validate a positive integer amount, check currency, or guarantee a unique reference under concurrent requests. The duplicate-reference check is outside the credit transaction and lacks a database uniqueness constraint.
- Wallet top-up credits `UPDATE wallets` without checking `rowCount`; a missing wallet can produce a ledger/success inconsistency.
- The settlement code debits a rider wallet at completion. If the rider had insufficient funds, it returns failure after the ride is already marked completed; cash/customer remediation is not defined.
- Cash settlement records a positive driver `cash_trip` ledger entry but does not create payoutable balance, which may be correct policy, but the product must clearly explain cash earnings and commission reconciliation.
- Admin revenue calculates positive `ride_payment` values (`auth.ts:313-315`), while settlement records rider `ride_payment` as a negative amount and commission separately. Dashboard revenue will therefore be wrong/zero for normal wallet rides and does not account for cash commission.
- Driver payout requests subtract balance and call a provider while inside a database transaction. A slow external provider call inside a DB transaction increases lock duration; idempotency and asynchronous provider state are absent.
- `paymentService.requestPayout` calls a Flutterwave collections endpoint for a payout-like operation and uses a callback URL for which no callback route was found. Provider API semantics must be verified and isolated behind a tested adapter.
- `DriverEarnings` disables “Request Payout” and says payouts are coming soon even though backend payout code exists. Decide whether it is not launched or finish the flow.
- Wallet transaction kinds are not a shared enum. The backend writes `withdrawal`, `refund`, `commission`, and `cash_trip`, while frontend interfaces list only `topup`, `ride_payment`, `payout`, and `tip`.

**Financial invariant tests required**

For cash, wallet, failed payment, duplicate callback, cancellation before/after assignment, tip, payout failure, and concurrent completion, assert:

`customer debits + driver credits + NAVIGO commission + refunds = provider/cash settlement`, exactly once.

### 6.9 History, saved places, profile, support

**Saved places**

- Ownership checks in `backend/src/routes/users.ts:38-45` and delete scoping are good.
- Creation rejects falsy coordinates, which incorrectly rejects valid `0` latitude/longitude; validate numeric ranges instead.
- The browser calls `photon.geocode.eu` directly, does not constrain results to Uganda, does not debounce/abort, and trusts arbitrary coordinates. Use a server proxy with a provider policy, bounds, rate limits, and attribution.

**Profile**

- Editing name/email calls the API and updates local auth state.
- Profile stats are hardcoded and the About NAVIGO row has no action.
- Email format is not validated server-side; update behavior can erase an existing email when the field is blank. Decide whether blank means remove and protect verified contact changes.
- There is no password change, phone change/OTP, notification preference, privacy/export/delete control, emergency contact management, or account closure flow.

**Support**

- FAQ topics cover fare, payment, cancellation, safety, driver onboarding, offline use, and rewards.
- The report form never calls the backend; `handleReportSubmit` only generates `Math.random()` ticket text and returns to FAQ. Therefore admin support cannot receive customer reports.
- The backend support route is available but does not validate type/priority against a strict schema, does not notify the user, and stores admin sender as the literal string `Admin` rather than an authenticated admin ID.
- Contact cards are clickable `div`s; the “Visit Us” card routes to booking rather than an office/contact location.
- “24/7”, “under 2 hours”, and “user notified” copy must reflect actual staffing/notification capability.

---

## 7. Driver journey: onboard → earn → close

### 7.1 Driver documents and approval

**Good**

- The UI explains verification status and separates vehicle type from required identifiers.
- Admin approval has filters, search, approve/reject actions, and a useful review modal.
- Approval status is checked in the driver home before the frontend allows online mode.

**Defects**

- Document images are not uploaded. The frontend sends the literal strings `'uploaded'` for `vehiclePhoto` and `selfieWithVehicle` (`DriverDocuments.tsx:61-63`) and shows “Coming soon” (`:240-250`).
- National ID and license values are stored as JSON text in `users.driverDocs`, not encrypted/segregated or access-logged.
- The unauthenticated upload endpoint is a direct IDOR and leaks the password hash in its response; this is a release blocker.
- Admin approval accepts any user ID and does not verify the target is a driver/motorist or that required document fields are complete.
- Reject action uses a generic hardcoded reason from `AdminApprovals.tsx:85-90`; there is no required reason, appeal, audit event, or notification.
- The driver’s female-preference toggle is local/requested but not persisted by the backend; it cannot reliably power “Women Preferred.”
- Driver status changes should be server-authoritative, not a frontend-only redirect/alert policy.

### 7.2 Online state, request, and active trip

- Driver home fetches `/drivers/profile` and can toggle `/drivers/status/online`, but the server does not restrict those endpoints to a driver role or approved verification status. Any authenticated user can call them.
- `isOnline` and `driver_profiles.online` are maintained separately; `isAvailable` is separate again. Use one state model or a transactional state transition.
- Driver request detail fallback uses zero coordinates if the API fails (`IncomingRequest.tsx:51-60`). Never display or navigate to `0,0` as a real route.
- The global driver notification overlay is non-functional: `DriverNotificationContext.acceptRequest` and `rejectRequest` only log and clear the request; they do not emit the accept/decline event. The page-level `IncomingRequest` has a separate implementation, creating two competing request UX paths.
- Driver active ride location sends client coordinates to the server. Server must validate plausible coordinate ranges, velocity jumps, ride membership, and active status; rate-limit and aggregate updates.
- Driver can complete a ride from the client, but there is no proof-of-arrival/start or geofenced/OTP confirmation. Define the operational policy rather than relying on a button.

### 7.3 Earnings, payouts, vehicle

- Earnings calculations from payout/tip transactions are a good direction, but the page currently says payouts are coming soon and the action is disabled.
- Total trips/rating come from `driver_profiles`, while DriverHome uses static `156`, `4.8`, `UGX 45,000`, `UGX 320,000`, and static activity. The same account can show contradictory figures across screens.
- Payout history tab is always an empty state and does not call `/wallet/payouts`.
- Vehicle details (`DriverVehicle.tsx:21-42`) are local state. Editing model/plate/color/year is not saved to `users` or `driver_profiles`, and document rows are static dates/statuses.
- Vehicle fields need validation (plate uniqueness, type/capacity, year, color), versioning, admin re-review on critical changes, and expiry reminders.

---

## 8. Admin journey and operations

### 8.1 Dashboard

**Good:** The dashboard has a useful operational information architecture: user/driver/ride/revenue KPIs, quick actions, alerts, and a compact overview.
**Bad:** `supportTickets` and `disputes` are explicitly mocked as zero in `auth.ts:325-327`; chart bars and alerts are static; `avgRating` has a frontend type mismatch; a “System is running normally” badge is shown without health checks.

The dashboard should show data freshness, time zone, query range, API health, payment settlement health, unmatched requests, safety incidents, and unresolved support—not decorative activity.

### 8.2 Approvals and sensitive review

`AdminApprovals.tsx` is the better of the two review pages because it calls `/auth/admin/pending-drivers`. It still needs:

- server-side pagination/search/filtering;
- redacted document previews and access audit logs;
- explicit approve/reject confirmation;
- mandatory rejection reason and notification;
- re-review after vehicle/document changes;
- role/verification checks on every mutation;
- protection against an admin approving their own account or deleting the last admin.

`AdminUserReview.tsx` must be removed, rewritten against PostgreSQL DTOs, or clearly marked as a non-production prototype. It contains hardcoded personal-looking sample data and uses `_id`, `name`, `status`, and other fields that do not match the API.

### 8.3 Users

The API-backed users screen has useful role/status filters and management actions. It needs:

- pagination and server-side filtering;
- confirmation/undo for permanent deletion;
- audit log with acting admin, reason, timestamp, and before/after status;
- self/last-admin protections;
- invalidation of active sessions/tokens on suspend/ban;
- consistent `fullName`/`name`, role, status, rating, and trip DTOs;
- no raw driver documents in the general user list.

### 8.4 Live map

- The map is visually clear and filters drivers/motorists/riders.
- `activeTrips` is explicitly set to `0` because a join is not implemented (`AdminLiveMap.tsx:108-112`), so the KPI is misleading.
- Demand circles are hardcoded locations/intensities, not live demand.
- It opens a separate socket with the token and does not use the shared socket service; it must be admin-only at the socket handshake and receive only admin-scoped events.
- Live location retention, precision, access logs, and operator privacy controls are not defined.

### 8.5 Analytics, payouts, settings

- `AdminAnalytics.tsx` calls `/api/admin/analytics/summary`, `/daily`, and `/top-drivers`; these are not present in `backend/src/index.ts` or the route files. This page cannot be real in the current backend.
- `AdminPayouts.tsx` calls `/api/auth/admin/payouts` and `/complete`; these routes are also absent. The page will show an empty/error state and cannot mark manual payouts.
- `AdminSettings.tsx` initializes fare/commission/support/maintenance values locally and `handleSave` only shows a toast. The displayed 15% commission conflicts with the server’s default 10%, and no setting changes `fare.ts` or server behavior.
- Production settings require a versioned, authenticated configuration API with audit history, validation, staged rollout, and a clear distinction between safe operational settings and deployment secrets. Never put gateway secrets in the client.

---

## 9. Realtime, chat, maps, and safety

### 9.1 Socket authorization and lifecycle

**Good controls already present**

- Socket handshake verifies a JWT (`socketHandler.ts:28-42`).
- Private room join checks the authenticated user ID.
- Ride-room join checks rider/driver membership.
- Status transitions have an allow-list and prevent reopening completed/cancelled rides.
- Ride acceptance uses a conditional status update in a transaction.

**What is still unsafe/incomplete**

- `join` requires a client user ID even though the token already identifies the user; eliminate redundant identity inputs.
- `request-ride` does not verify that the socket user owns the ride or that the ride is in `requested` state.
- `update-location` does not check that the user is the assigned driver/rider for the ride ID; a user can publish into another ride room if they know its ID.
- `admin-location-updated` uses `io.emit`, not an admin room.
- There is no event schema validation, maximum payload size, per-event rate limit, heartbeat/last-seen model, replay/sequence number, or reconnect resync protocol.
- Global `SocketService` retains a socket after logout; a later user session may reuse a socket authenticated with an old token.
- Socket events use `any` heavily, making contract drift likely.

### 9.2 Chat

`ChatBox.tsx` is a visually good chat surface with quick replies, emoji, location sharing, status icons, and typing UI. The protocol is not complete:

- Frontend emits `load-messages`, `message-read`, and `typing`; backend has no handlers for those events.
- Backend `send-message` relays a client-supplied object and does not persist it, validate length/type, sanitize content, or assign a server message ID/timestamp.
- Refreshing the chat loses history; delivered/read indicators are cosmetic.
- The call button has no handler.
- “Messages are secure and encrypted” is not substantiated. TLS protects transport when configured; it is not end-to-end encryption.
- Each chat opens its own socket rather than reusing an authenticated connection.

### 9.3 Maps and geolocation

**Good**

- Leaflet assets are bundled, marker icons are configured, OSRM routes have an 8-second abort, and a straight-line fallback preserves basic fare UX.
- The map shows a friendly tile-unavailable state instead of a black void.
- Vehicle-specific icons and live marker animation are a strong product touch.

**Defects/performance**

- `NavigoMap.tsx:256` has a Leaflet typing error.
- The component does not fully clean up the map, resize observer, move handlers, POI timers, and animation on unmount. This is especially risky under React StrictMode and repeated route navigation.
- POI discovery queries Overpass at 1 km, 5 km, and 25 km after map movement, without aborting old requests. A 25 km query containing many OSM feature classes is expensive and can hit provider limits.
- Popup HTML includes external/tag-derived `name` and `amenity` without escaping (`:210-214`); sanitize before inserting HTML.
- Route calculation runs whenever relevant props change and can race with prior requests; use a request identity/abort cleanup so stale routes cannot overwrite current state.
- Map tiles, OSRM, Nominatim, Photon, Overpass, and Google Maps are separate external dependencies with no provider health policy, attribution/privacy boundary, or server-side fallback.
- “100% Accurate GPS” and “REAL-TIME ROUTE” copy is misleading. Browser GPS has accuracy limits and OSRM is not necessarily a real-time traffic route.
- Driver/customer location updates need distance/velocity sanity checks and privacy retention rules.

### 9.4 SOS and emergency response

The visual affordance is prominent, countdown/cancel behavior is a good start, and default Uganda emergency contacts are discoverable. However:

- The message string is calculated and unused.
- `window.open('tel:...', '_system')` only hands off to a dialer; it does not send an SMS, notify NAVIGO, persist an incident, or prove that a call was answered.
- The UI says “Alert sent” and “Help is on the way” without knowing whether the dialer opened or a responder acknowledged.
- Custom contacts are stored only in component state and disappear on reload.
- Hospital distances are static; they are not calculated from current location.
- Emergency data, contact consent, retention, escalation, false alarm handling, and staff response procedures are absent.

Until an actual escalation contract exists, change the copy to “Call emergency services” / “Open dialer” and clearly show what NAVIGO can and cannot do.

---

## 10. Design, responsive behavior, and accessibility

### 10.1 Visual system

**Strengths**

- Ember/orange against navy-black is distinctive and consistent.
- Glass cards, badges, status colors, local vehicle art, empty states, and compact mobile information density create a recognizable experience.
- Inter/Sora pairing is appropriate for operational dashboards and marketing headings.
- Most flows use clear section headings, iconography, and actionable empty states.

**Issues**

- The code mixes inline styles, page CSS, Ionic tokens, and global header overrides. This makes theme changes and cross-device consistency difficult.
- `index.html:20-36` applies broad `!important` rules to every Ionic header, while many pages also set their own toolbar variables. This is a brittle workaround rather than a theme contract.
- Some pages use different header backgrounds (`#1A1A1A`, `#080c14`, `#121212`) and different text opacity values. Define tokens for surface, border, muted, success, warning, danger, and focus.
- Marketing language and trust badges are stronger than the implemented service guarantees. Align visual trust signals with real verification/payment/safety states.

### 10.2 Breakpoints and layout

The explicit breakpoint coverage is very small:

- `Home.css`: one `@media (max-width: 768px)` block.
- `RideRequest.css`: three `@media (min-width: 1024px)` blocks.
- Most pages depend on inline grids such as `1fr 1fr`, fixed `maxWidth`, and Ionic defaults rather than a documented responsive system.

Recommended supported layout matrix:

- **320–374 px:** no horizontal overflow, minimum 44 px controls, readable fare/route labels, single-column cards.
- **375–767 px:** standard mobile booking and active ride layouts; safe-area bottom padding.
- **768–1023 px:** tablet split layout only where map/form remain usable; avoid simply stretching mobile cards.
- **1024+ px:** desktop booking split pane, admin tables/drawers, keyboard-friendly navigation, denser but readable dashboards.
- **Landscape mobile:** verify keyboard and map height; do not rely on `100vh` without dynamic viewport handling.

Likely pressure points are the 4-column admin segments, 3-column history/profile stats, long destination names, driver document cards, fare bid row, support contact grid, and active-ride bottom actions.

### 10.3 Accessibility

Confirmed patterns needing correction:

- Many interactive `div`s/spans are used instead of buttons/links: destination rows, admin cards, vehicle options, SOS contacts, support contact cards, quick actions, and map controls.
- Only a small number of fields implement Enter-key handling. Focus order, Escape behavior, and modal focus return are not systematically implemented.
- Icon-only buttons generally lack `aria-label` or visible accessible names.
- Error boxes use checkmark icons; status relies heavily on color/emoji.
- Disabled/selected states are not always announced (`IonChip`/custom cards).
- The viewport sets `maximum-scale=1.0, user-scalable=no` (`frontend/index.html:8`), preventing pinch zoom. Restore user zoom for low-vision users.
- No `prefers-reduced-motion` handling was found for pulse/fade/marker animations.
- Need contrast testing for muted text over glass surfaces, focus-visible styles, screen-reader labels for map/location controls, live regions for ride status, and accessible countdown announcements.

### 10.4 Content and trust

- Clarify “estimate” versus “final fare.”
- State whether cash, wallet, Mobile Money, and cards are actually available in the current market launch.
- Replace “encrypted”, “alert sent”, “help is on the way”, “100% accurate”, “real-time route”, “#1”, and “4-min pickups” where the system cannot prove those claims.
- Add cancellation policy, privacy/retention, provider fees, driver commission explanation, and delivery liability/receiver confirmation.

---

## 11. Performance, PWA, and deployment readiness

### Frontend bundle and loading

- Main bundle is too large for a mobile-first Kampala product: approximately 1.89 MB minified/443 KB gzip before runtime caches.
- Leaflet, routing, admin pages, all vehicle assets, auth, and customer/driver/admin code are eagerly imported through `App.tsx`. Use route-level `React.lazy`/dynamic imports and split admin/map/routing modules.
- The legacy plugin creates additional output; retain it only if supported-device analytics justify the cost.
- Establish budgets: initial JS, total transfer, LCP, INP, map time-to-interactive, and low-end Android performance.

### Requests and effects

- Search requests need debounce + `AbortController` + stale-result protection.
- Reverse geocoding must be throttled and proxied.
- POI discovery needs viewport/radius limits, caching, cancellation, and a server/provider quota.
- Map route requests need cleanup and response identity checks.
- Customer/driver/admin pages should use a shared query layer with cancellation, retry/backoff, stale timestamps, and error states.
- Duplicate direct sockets (`socketService`, `ChatBox`, `AdminLiveMap`) should be consolidated.
- `MutationObserver` in `index.html:68` watches the entire document and runs a broad header scan on every mutation. Remove it after fixing the Ionic theme at source or scope it narrowly.

### Service worker/PWA

`frontend/public/sw.js` applies stale-while-revalidate to **every GET request** without restricting the origin or excluding API/auth/private content. This can cache:

- authenticated API responses;
- stale user/account data;
- cross-origin map/provider responses;
- error responses or opaque responses depending on browser behavior.

Change to an app-shell strategy for same-origin static assets only; use network-first/no-store for API/auth; version caches; cleanly handle activation; and provide offline UX that does not imply a booking/payment succeeded. Add an offline queue only for explicitly idempotent, user-visible operations.

The manifest is present and includes a 512px icon, but add maskable/icon sizes, screenshots if install UX matters, and test install/update/uninstall flows on Android Chrome and iOS Safari/PWA.

### Backend/deployment

- `backend/package.json` has no real test script (`test` exits 1).
- The server defaults to `postgresql://postgres:password@localhost:5432/navigo` if `DATABASE_URL` is missing; production must fail closed rather than use default credentials.
- Database initialization runs large DDL on startup and calls `process.exit(1)` on connection failure. Use versioned migrations, startup health/readiness, and retry/backoff.
- `CREATE TABLE IF NOT EXISTS` does not safely migrate existing tables; the ad-hoc migration only addresses a few user columns and does not version schema changes.
- Add indexes for ride user/driver/status/requestedAt, wallet transaction user/createdAt/reference, payouts user/status, support ticket status/createdAt, and driver availability/location.
- CORS allows every origin when `ALLOWED_ORIGINS` is absent (`index.ts:27-39`). That is not a safe production default. Fail closed in production and configure exact origins/credentials.
- Add security headers, request body limits, structured logging with redaction, correlation IDs, audit events, health/readiness endpoints, metrics, and alerting.
- `app.use` request logging is mounted after the route handlers, so it does not serve as a reliable request logger for handled routes.
- Do not log phone/email identifiers and authentication details at normal production verbosity (`auth.ts:154-172`).

### Preview/deployment configuration

- `frontend/vercel.json` rewrites all paths to `index.html`, which is appropriate for the client router.
- Frontend defaults to `http://localhost:5000/api`; a deployed frontend without `VITE_API_URL` will call the browser’s localhost, not the deployed backend.
- The preview/server configuration should be tested with `0.0.0.0` and a real preview origin, not only localhost.
- Configure HTTPS, `ALLOWED_ORIGINS`, `PUBLIC_BACKEND_URL`, `REDIRECT_URL`, `JWT_SECRET`, database URL, provider keys, and callback URLs as deployment-managed secrets with a startup checklist.

---

## 12. Security and privacy review

### Positive foundations

- Passwords are hashed with bcrypt.
- JWT verification is centralized.
- Admin REST paths use `authenticate` and `authorize(['admin'])`.
- Saved-place and ride-history routes include ownership checks.
- Ride details restrict access to participants, with a deliberate pending-ride exception that needs narrowing to eligible drivers.
- Rate limiters exist for general, auth, and SMS traffic.
- SQL values are parameterized through the wrapper in most routes.

### Required corrections

1. **Token/storage model:** localStorage bearer tokens, 30-day JWTs, unused sessions table, no server revocation, and stale user hydration need a coherent session design.
2. **Document data:** remove IDOR, sanitize response, encrypt or segregate sensitive identifiers, use private object storage for images, apply retention/deletion policy, and log access.
3. **Authorization:** restrict driver status/profile routes to drivers; derive all subject IDs from the token; verify ride membership for every socket event; restrict admin socket rooms.
4. **CORS/headers:** exact allowlist in production, secure cookies if used, HSTS/helmet/CSP/frame policy/referrer policy, body size limits, and content-type validation.
5. **Payment integrity:** unique transaction/provider references, idempotency keys, signed callbacks, amount/currency/merchant validation, no client-authoritative wallet credit, reconciliation and refund controls.
6. **Input validation:** use a shared schema library for auth, coordinates, phone numbers, prices, status transitions, support content, message payloads, and pagination. Reject NaN, Infinity, negative amounts, out-of-bounds coordinates, oversized strings, and unexpected keys.
7. **Privacy:** define collection/use/retention of precise location, receiver phone, NIN/license, chat, emergency contacts, and payment references; provide user controls and legal copy.
8. **Abuse controls:** protect account enumeration, OTP bombing, fake ride spam, request floods, chat spam, coordinate spoofing, promo abuse, referral abuse, and repeated ratings.

---

## 13. Data model and API contract gaps

### Role model

Current code uses all of `rider`, `customer`, `driver`, `motorist`, and `admin` across different layers. Choose one canonical representation, for example:

- `customer` for the customer role;
- `driver` for car drivers;
- `motorist` for boda operators;
- `admin` for operations;

or keep `rider` but remove `customer`/`motorist` everywhere. Publish a typed shared contract instead of repeating string unions.

### Shared entities to define

- `UserSummary` (no password/docs by default)
- `DriverProfileSummary`
- `RideSummary` with `fareFinal`, `fareBreakdown`, `paymentState`, `status`, `version`
- `LocationPoint` with numeric bounds and timestamp/accuracy
- `WalletBalance` and ledger entry enum
- `PaymentAttempt`/`ProviderTransaction`
- `SupportTicket`/reply with authenticated actor IDs
- `DriverDocument` metadata/private URL/verification state
- `SocketEvent` discriminated unions

Generate or validate these at the API boundary. The current pattern of `SELECT *` plus frontend `any` is the main source of drift.

### Ride state machine

Document allowed transitions and who may perform them:

`requested → accepted → arrived → ongoing → completed`
`requested/accepted/arrived/ongoing → cancelled`

Add expiry, rider/driver cancellation rules, no-show, payment authorization failure, settlement pending/failed, and operator intervention states. Enforce transitions atomically in SQL with actor/role checks and emit events only after commit.

### Database hardening

- Add `CHECK` constraints for positive amounts, coordinates, durations, distances, and valid roles/statuses.
- Add unique constraints for provider transaction/reference identifiers and rating-per-ride policy.
- Make wallet row creation an invariant.
- Use a real migration framework with numbered migrations and rollback/forward compatibility.
- Add indexes and archive/retention strategy for location, chat, and ledger data.

---

## 14. Testing strategy required before launch

### Unit tests

Expand the current 6 tests to cover:

- phone normalization and validation;
- fare breakdown for every vehicle, distance, duration, and delivery;
- offer clamping and rounding;
- commission/driver-share invariants;
- ride transition matrix;
- wallet ledger invariants;
- auth/session parsing and role redirects;
- map route fallback/abort behavior;
- promo eligibility and idempotency.

### Backend integration tests

Run against disposable PostgreSQL with migrations:

- registration/login/OTP/reset/OAuth;
- ownership and role authorization for every route;
- document upload IDOR regression;
- wallet creation/top-up duplicate callbacks/amount mismatch;
- cash and wallet settlement exactly once;
- concurrent driver acceptance;
- driver online/available/approval behavior;
- cancellation/refund/tip/payout callback;
- support create/reply/resolve;
- socket room and event authorization.

### Frontend component/flow tests

- public landing and auth validation;
- role-specific protected redirects;
- customer booking with guest prompt, API failures, duplicate confirmation, delivery fields, payment selection;
- active ride reconnect/status/rating/tip/cancel;
- driver incoming request timeout/accept/decline;
- admin approval/user/payout/support actions;
- accessible keyboard/focus/modal behavior.

### E2E/device matrix

The existing Cypress suite is stale: it expects the old `/rider/*` routes and the default Ionic starter text (`test.cy.ts`). Update it to `/customer/*`, mock or provision the API, and remove assumptions about old pages. Run at minimum:

- Chrome Android 390×844, slow 3G, GPS denied/allowed;
- Safari iOS PWA, safe areas, call/deep-link behavior;
- desktop Chrome/Firefox 1280×800 for admin;
- 320px width and landscape mobile;
- offline/online transitions and service-worker update;
- real or sandbox payment/SMS callbacks.

### Observability acceptance

Every booking/payment/SOS/approval/payout must have a correlation ID, structured event, actor, state transition, provider reference, and operator-visible failure reason without logging secrets or full sensitive documents.

---

## 15. Prioritized remediation plan

### Phase 0 — Stop-the-line correctness and safety

1. Fix dotenv/import ordering, required environment validation, and backend TypeScript build.
2. Fix frontend TypeScript diagnostics, then make lint errors a tracked burn-down rather than suppressing them.
3. Define canonical roles and shared DTOs.
4. Secure document upload and remove password/data leakage.
5. Implement real OTP/verification and OAuth session hydration.
6. Create wallets/profiles transactionally and repair top-up/payment initiation/verification/idempotency.
7. Make fare, route distance, payment method, promo, and final amount server-authoritative.
8. Implement targeted matching, availability, atomic acceptance, reconnect recovery, and safe state/settlement handling.
9. Implement tip or remove the UI; implement truthful SOS incident/escalation or change the copy.
10. Restrict socket/API location access and remove global coordinate broadcasts.

### Phase 1 — Make every visible feature honest and complete

1. Connect customer support form to `/api/support` and notify customers on reply/resolve.
2. Replace hardcoded driver/customer/profile/reward/admin figures with API data or clearly labeled demo mode.
3. Implement payout admin routes and driver payout UI, including provider/manual reconciliation.
4. Remove/rebuild duplicate `CustomerPayments` and `AdminUserReview` screens.
5. Implement analytics endpoints or hide analytics until data exists.
6. Persist vehicle details, document metadata, female-preference setting, emergency contacts, and loyalty ledger.
7. Finish chat persistence/read/typing/call actions and remove the unsupported encryption claim.
8. Add receipts, fare breakdown, cancellation/refund/no-show policies, and delivery proof/receiver confirmation.

### Phase 2 — Performance and quality

1. Add route-level code splitting and reduce initial JS under an agreed mobile budget.
2. Proxy/geofence/debounce/abort geocoder, POI, and routing requests.
3. Clean map/socket/service-worker resources and narrow cache scope to same-origin static assets.
4. Replace global header mutation with Ionic theme tokens.
5. Restore pinch zoom, semantic controls, focus/ARIA/live regions, reduced motion, safe-area padding, and contrast compliance.
6. Add database indexes, migrations, security headers, exact CORS, redacted logs, health checks, metrics, and alerts.
7. Refresh Cypress routes and add real integration/device coverage.

### Phase 3 — Differentiation / “outstanding” product layer

After correctness is proven:

- reliable low-bandwidth mode with explicit offline state and safe retry queues;
- driver heatmap based on real demand, not static circles;
- transparent fare breakdown and bid rationale;
- driver earnings forecasting and payout ETA;
- scheduled rides, multi-stop routes, business accounts, and delivery proof;
- trusted-contact trip sharing with consent and expiry;
- accessible localization, Luganda/English language support, and larger-text mode;
- safety operations console with incident SLA and post-incident review;
- customer loyalty ledger with auditable rewards and anti-abuse rules;
- product analytics based on consented, privacy-safe events.

---

## 16. Launch checklist

Do not mark NAVIGO launch-ready until all answers are **yes**:

- [ ] Backend starts from a clean environment with a migration-applied PostgreSQL database.
- [ ] Backend TypeScript build passes with no diagnostics.
- [ ] Frontend typecheck passes with no diagnostics.
- [ ] Lint is below an agreed threshold and no security/data-flow errors remain.
- [ ] Registration, OTP, login, logout, expiry, suspend/ban, and OAuth paths are tested.
- [ ] Every new account has the required wallet/profile rows.
- [ ] A sandbox top-up can be initiated, verified, replayed safely, and reconciled.
- [ ] A ride can be booked with cash and wallet in a sandbox; final fare matches the server quote.
- [ ] Delivery fee/receiver/confirmation rules are tested.
- [ ] Two drivers cannot accept the same ride; only eligible drivers receive it.
- [ ] Driver availability and active-trip exclusivity work after reload/reconnect.
- [ ] Completion/settlement/tip/cancel/refund/payout failure paths are recoverable and exactly once.
- [ ] No user can read or mutate another user’s ride, location, documents, wallet, or support ticket.
- [ ] Admin locations/events are admin-only; sensitive access is audited.
- [ ] Chat persists and its security copy is accurate.
- [ ] SOS behavior is real, acknowledged, and honestly described.
- [ ] Unknown routes show a real 404 screen; Terms and Privacy are published.
- [ ] PWA caching excludes private/API responses and update rollback is tested.
- [ ] 320px, 390px, tablet, desktop, landscape, keyboard, screen-reader, zoom, and reduced-motion checks pass.
- [ ] Production observability, backups, migrations, incident runbooks, and provider alerts are in place.

---

## Final assessment

NAVIGO is **visually promising and strategically broad**, but it is currently closer to a polished prototype/vertical slice than a safe ride-hailing platform. The next priority is not adding more screens. It is consolidating the role/API/data model, making money and ride state authoritative, closing authorization/privacy gaps, making realtime recoverable, and proving the complete journeys with PostgreSQL/provider-backed integration tests. Once those foundations are reliable, the existing design language can become a genuinely outstanding Uganda-first mobility product rather than a surface that over-promises what the system cannot yet guarantee.
