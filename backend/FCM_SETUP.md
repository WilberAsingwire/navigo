# Firebase Cloud Messaging setup (backend)

NAVIGO's Android app uses the Firebase project configured in
`frontend/android/app/google-services.json`. The backend sends push
notifications through the Firebase Admin SDK.

## Configure the backend

1. Open Firebase Console and select the NAVIGO project (`navigo-24b12`).
2. Open **Project settings → Service accounts**.
3. Select **Generate new private key** and download the service-account JSON.
4. Keep that file private. Do not commit it, put it in the frontend, or send it
   in a chat or issue.
5. In the backend hosting service (Render), open the NAVIGO API service's
   environment settings and add:
   - Key: `FIREBASE_SERVICE_ACCOUNT_JSON`
   - Value: the complete contents of the downloaded service-account JSON.
6. Save the environment change and redeploy/restart the backend.

The backend parses this JSON at runtime. It does not need a separate
`GOOGLE_APPLICATION_CREDENTIALS` file on the server.

## Notifications currently sent

- A new ride or delivery request is sent to the same eligible, nearby drivers
  selected by NAVIGO's existing vehicle-type and proximity matching.
- The customer is notified when a driver accepts.
- The customer is notified when the driver arrives, starts the trip, or
  completes it.
- The other booking participant is notified when a ride is cancelled.

Push delivery is best-effort. Existing Socket.IO events remain in place and
continue to provide in-app real-time updates.

## Android testing

- Install the Android build on a real Android device with Google Play services.
- Sign in and allow notification permission when Android asks.
- Keep the account signed in so its FCM device token can be registered.
- Test with two accounts/devices: one customer and one approved, online driver.
- Put the customer app in the background, request a ride, and verify the
  driver's device receives a notification. Then accept the ride and verify
  the customer's device receives one.
- Repeat for arrival, trip start, completion, and cancellation.

A successful Android build alone does not prove FCM delivery. Real-device
testing with the backend service-account environment variable configured is
required.
