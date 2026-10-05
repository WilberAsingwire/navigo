# NAVIGO 🏍️🚗

Ride-hailing for Uganda — boda bodas, cars, and deliveries with fare
bargaining, a built-in wallet, and real-time tracking. Built to run entirely
on **free services** today, with a clean switch to paid providers later.

| | |
|---|---|
| **Backend** | Node.js + Express + TypeScript, PostgreSQL, Socket.io |
| **Frontend** | Ionic React + Vite (PWA), Leaflet + OpenStreetMap |
| **Realtime** | Socket.io (ride matching, chat, live tracking) |
| **Payments** | Free mode: manual Mobile Money (person-to-person, admin-verified). Paid mode: Flutterwave (set `FLUTTERWAVE_SECRET_KEY`) |

---

## Quick start

### 1. Backend

```bash
cd backend
npm ci
cp .env.example .env    # fill in JWT_SECRET and DATABASE_URL (see below)
npm start               # → http://localhost:5000
```

Required env: `JWT_SECRET`, `DATABASE_URL` (PostgreSQL). Everything else is
optional — see [`backend/.env.example`](backend/.env.example) for the full,
documented list. Without a reachable PostgreSQL in development, the server
falls back to a throwaway in-memory store (never in production).

### 2. Frontend

```bash
cd frontend
npm ci
npm run dev             # → http://localhost:5173
```

Set `VITE_API_URL` to point at the backend (defaults work for local dev).

---

## The free stack (and its paid upgrade path)

| Capability | Free (works today) | Paid (flip a switch later) |
|---|---|---|
| Maps & tiles | OpenStreetMap + Esri imagery (no key) | Google Maps / Mapbox (swap TileLayer URL) |
| Routing | OSRM public API | Google Directions |
| Wallet top-ups | Rider sends MoMo to the NAVIGO number, submits the transaction ID, admin verifies & credits | Flutterwave hosted checkout + webhook (`FLUTTERWAVE_SECRET_KEY`) |
| Driver payouts | Admin queue — send MoMo, mark paid (reject = auto-refund) | Flutterwave transfers API |
| OTP / SMS | Email delivery (Gmail SMTP) or dev-mode codes; enforcement off by default | Africa's Talking SMS (`REQUIRE_PHONE_VERIFICATION=1`) |
| Email | Gmail + Nodemailer | Transactional provider |

The database schema, wallet ledger, and admin screens are identical in both
modes — `GET /api/wallet/payment-info` reports which mode is active.

## Money & fares

- Fares: per-vehicle base + per-km + per-min, free first 500 m, minimum
  fares, totals rounded down to 100 UGX (see `backend/src/utils/fare.ts`)
- Bargaining: riders can offer 65–150 % of the recommended fare
- Commission: 10 % (clamped 5–20 % via `NAVIGO_COMMISSION_RATE`)
- Settlement: atomic DB transactions with row locks; wallet shortfalls fall
  back to cash settlement automatically

## Tests & CI

```bash
cd backend  && npm test        # fare engine + phone normalization
cd frontend && npx vitest run  # config + app smoke tests
```

GitHub Actions (config in `docs/ci/` — see `docs/ci/README.md` to enable) typechecks, tests, and
production-builds both projects on every push.

## Repository layout

```
backend/    Express API, Socket.io handlers, PostgreSQL schema
frontend/   Ionic React PWA (rider, driver, and admin apps in one)
docs/       Archived audit reports & design docs
```

`CODEBASE_ANALYSIS.md` tracks the full audit findings and the fix log.
