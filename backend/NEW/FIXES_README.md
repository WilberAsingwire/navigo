# Nature Track — Fixes Applied

## How to apply these fixes

### BACKEND (fixes the crash)

1. **Replace** `backend/tsconfig.json` with the one in `backend/tsconfig.json`
2. **Replace** `backend/package.json` with the one in `backend/package.json`
3. In your terminal, run:
   ```powershell
   cd "C:\Users\gover\Desktop\NATURE TRACK\backend"
   npm install
   npm run dev
   ```

The backend will now start cleanly.

---

### FRONTEND (copy files into your src/)

Copy each file from `frontend/src/` into the matching path in your project:

| File | What was fixed |
|---|---|
| `src/api/config.ts` | **NEW FILE** — single source of truth for backend URL |
| `src/api/axiosInstance.ts` | Uses `config.ts` instead of hardcoded `localhost:5000`; auto-redirects to `/login` on 401 |
| `src/api/rideService.ts` | Uses shared `axiosInstance` instead of raw axios |
| `src/context/AuthContext.tsx` | Uses `config.ts`; fixed online/offline event listeners; `clearToken` now also clears user |
| `src/context/SocketContext.tsx` | Uses `config.ts`; added reconnection config and error logging; fixed double-connect bug with ref |
| `src/services/syncService.ts` | Uses shared `axiosInstance` instead of raw axios + hardcoded URL |
| `src/pages/admin/AdminDashboard.tsx` | Added missing `IonBadge` import (was crashing at runtime) |
| `src/pages/admin/AdminLiveMap.tsx` | Removed nested `IonPage` anti-pattern (was causing layout bugs) |

Also copy `.env.example` to your frontend project root. Then:
```powershell
copy frontend\.env.example "C:\Users\gover\Desktop\NATURE TRACK\.env.local"
```

---

## What was wrong

### Backend crash
- `"type": "module"` in `package.json` + `"module": "nodenext"` in `tsconfig.json` forced ESM mode
- Express and its `@types/express` package are CommonJS — named imports like `import { Request, Response } from 'express'` don't work in strict ESM
- **Fix:** Changed to `"module": "CommonJS"` in tsconfig, removed `"type": "module"` from package.json
- Also: your backend was using the **frontend's tsconfig** (it had `"jsx": "react-jsx"` — that's a React setting, not a Node.js one)
- Also: `tsx` was missing from `devDependencies` even though the dev script calls it — added it

### Frontend issues fixed
1. **Missing `IonBadge` import** in `AdminDashboard.tsx` → runtime crash on admin page
2. **Nested `IonPage`** in `AdminLiveMap.tsx` → broken layout (double header, tab bar issues)
3. **Hardcoded `localhost:5000`** in 4 different files → created `src/api/config.ts` as single source of truth
4. **Raw axios** used in `rideService.ts` and `syncService.ts` bypassing the auth interceptor → switched to shared `axiosInstance`
5. **Online/offline state** in `AuthContext` never actually listened to browser events → added proper `window` event listeners
6. **Socket double-connect** bug (checking `socket` state instead of ref) → fixed with `useRef`

---

## Remaining known issues (for later)

- `useAuthStore` (Zustand) and `AuthContext` both manage auth state in parallel — consolidate to one
- `AdminDashboard` KPI stats are hardcoded — wire to a real `/api/admin/stats` endpoint
- `AdminSettings` save button logs to console only — wire to a real API call
- `Map.tsx` is 1073 lines — good candidate for splitting into smaller components
