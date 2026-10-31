# NAVIGO Android build

NAVIGO keeps its Ionic React + Vite frontend and packages it as an Android app with Capacitor.

## Requirements

- Node.js 22.12 or later
- JDK 21
- Android Studio 2025.2.1 or later
- Android SDK Platform 36 and Build Tools 36.0.0
- An HTTPS URL for the deployed NAVIGO backend

The Android application ID is `ug.co.navigo.app`.

## Configure the backend URL

Create `frontend/.env.production` locally (do not commit private credentials) and set:

```env
VITE_API_URL=https://your-hosted-navigo-backend.example/api
```

Use the actual deployed NAVIGO API origin. The server must be reachable from the phone. Do not use `localhost`, `127.0.0.1`, or a development-only URL in an Android build.

The same `VITE_API_URL` value is used for REST requests and Socket.IO. It is a public endpoint, not a secret. Never put API keys, database credentials, Mobile Money credentials, or signing passwords in a `VITE_*` variable.

## Build and open Android

From the `frontend` directory:

```bash
npm ci
npm run build:android
npm run cap:android
```

Android Studio opens the native project in `frontend/android`. To build a debug APK from a terminal after syncing:

```bash
cd android
./gradlew assembleDebug
```

On Windows, use `gradlew.bat assembleDebug`.

## Location and notifications

The native Geolocation plugin is used on Android; browser geolocation remains the web fallback. NAVIGO declares coarse and fine foreground location permissions. The driver is required to obtain a fresh Uganda location and send it to the backend before becoming available for bookings.

This setup does not yet provide guaranteed background location tracking. Capacitor's standard Geolocation plugin is intended for foreground position access; reliable tracking when Android suspends the app needs a dedicated background-location design and its own persistent notification/foreground-service permissions.

Push notifications are not configured yet. They require a Firebase project, Android `google-services.json`, a registered device token, and server-side Firebase credentials. Do not commit Firebase service-account keys or signing credentials to the repository.

## CI

GitHub Actions checks the frontend, backend (including PostgreSQL-backed tests), and compiles the Android debug app. CI does not publish an APK because a real hosted `VITE_API_URL` must be configured before producing an installable build.
