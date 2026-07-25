# Implementation Plan: NatureTrack Frontend Completion

## 1. Objective
Transform the NatureTrack frontend from a UI prototype with hardcoded data and mocked logic into a fully functional, production-grade application.

## 2. Critical Path Analysis
The core functionality must follow this sequence:
**User Auth** $\rightarrow$ **Ride Request** $\rightarrow$ **Driver Acceptance** $\rightarrow$ **Trip Completion** $\rightarrow$ **Payment**.

## 3. Global Strategy

### 3.1 State Management
- **Auth Context**: Introduce `src/context/AuthContext.tsx` to manage authentication tokens, user roles, and session persistence (localStorage).
- **Ride State**: Implement a centralized way to track the active ride status (Requested, Accepted, Arrived, In-Progress, Completed).

### 3.2 API Layer
- **Unified Client**: Create `src/services/api.ts` as a wrapper for `fetch` (or `axios`) to:
  - Handle base URLs.
  - Automatically attach `Authorization: Bearer <token>` headers.
  - Standardize error responses.
- **Real-time Communication**: Standardize `socket.io-client` usage to handle ride broadcasts and location updates.

### 3.3 Error Handling
- **UI Feedback**: Use `useIonToast` for immediate user feedback on API failures.
- **Loading States**: Implement consistent loading overlays using `useIonLoading`.
- **Guards**: Implement `ProtectedRoute` components to enforce role-based access (Admin vs Driver vs Customer).

## 4. Implementation Phases

### Phase 1: Foundation & Authentication
*Goal: Establish a secure, role-based entry point.*

1. **Core Infrastructure**:
   - Create `src/services/api.ts` for HTTP requests.
   - Create `src/context/AuthContext.tsx` for global user state.
   - Create `src/components/ProtectedRoute.tsx` for role gating.
2. **Authentication Flow**:
   - Update `src/pages/auth/Login.tsx` to use the API client and AuthContext.
   - Implement real logic in `src/pages/auth/Register.tsx` for account creation.
   - Replace mocks in `src/pages/auth/PhoneVerification.tsx` with OTP validation endpoints.
   - Replace mocks in `src/pages/auth/ForgotPassword.tsx` with password recovery endpoints.
   - Implement Social Login redirects (Google/Facebook) to backend OAuth handlers.

### Phase 2: Customer Ride Request Flow
*Goal: Enable users to book rides with dynamic data.*

1. **Dynamic Location Input**:
   - Modify `src/pages/customer/RideRequest.tsx` to replace hardcoded "Makerere University" with dynamic input or map selection.
   - Implement the destination selection logic (Step 2) to capture a real coordinate/address.
2. **Fare Calculation**:
   - Integrate an API call to `/api/rides/estimate` to calculate real-time fares based on distance and `rideType`.
3. **Ride Dispatch**:
   - Update `socket.emit('request_ride', ...)` to send real user IDs and coordinates.
4. **Driver Tracking**:
   - Enhance the `ride_accepted` listener in `src/pages/customer/RideRequest.tsx` to update the map with the actual driver's position.

### Phase 3: Driver Acceptance & Trip Execution
*Goal: Enable drivers to manage and complete rides.*

1. **Ride Notification**:
   - Implement the socket listener in `src/pages/driver/DriverHome.tsx` to trigger `IncomingRequest.tsx`.
2. **Acceptance Logic**:
   - Update `src/pages/driver/IncomingRequest.tsx`'s `handleAccept` to call `/api/rides/accept`.
3. **Active Trip Management**:
   - Create `src/pages/driver/DriverActiveRide.tsx` to track the journey from Pickup $\rightarrow$ Drop-off.
   - Implement "Arrived at Pickup" and "Complete Trip" buttons that notify the backend.

### Phase 4: Wallet, Payments & Profile
*Goal: Monitize the service and manage user data.*

1. **Wallet Integration**:
   - Update `src/pages/customer/CustomerPayments.tsx` to fetch real balances from `/api/wallet/balance`.
   - Implement top-up functionality via payment gateway integration.
2. **Automatic Payment**:
   - Connect "Complete Trip" in Driver flow to a backend trigger that deducts fare from customer wallet.
3. **Profile Editing**:
   - Implement real `PUT` requests in `src/pages/customer/Profile.tsx` and `src/pages/driver/DriverVehicle.tsx`.
4. **Earnings Tracking**:
   - Replace hardcoded data in `src/pages/driver/DriverEarnings.tsx` with data from `/api/driver/earnings`.

### Phase 5: Administrative Control
*Goal: Complete the management suite.*

1. **User Management**:
   - Implement real deletion logic in `src/pages/admin/AdminUsers.tsx`.
   - Enable editing of user roles and statuses.
2. **Verification Flow**:
   - Enable document viewing and approval in `src/pages/admin/AdminUserReview.tsx`.
3. **Global Monitoring**:
   - Connect `src/pages/admin/AdminLiveMap.tsx` to a real-time stream of all active driver locations.

### Phase 6: Final Polish & QA
*Goal: Ensure stability and production-readiness.*

1. **Input Validation**: Add Zod or similar validation to all forms.
2. **Comprehensive Error Handling**: Audit all API calls for proper try-catch and user notifications.
3. **Performance Optimization**: Implement memoization where necessary and optimize map re-renders.
4. **E2E Testing**: Run full critical path tests (Customer $\rightarrow$ Driver $\rightarrow$ Payment).

## 5. Critical Files Mapping

| Feature | Files to Modify / Create |
| :--- | :--- |
| **Auth** | `src/pages/auth/Login.tsx`, `src/pages/auth/Register.tsx`, `src/pages/auth/PhoneVerification.tsx`, `src/pages/auth/ForgotPassword.tsx`, `src/context/AuthContext.tsx` (NEW) |
| **Ride Request**| `src/pages/customer/RideRequest.tsx`, `src/services/api.ts` (NEW) |
| **Driver Flow** | `src/pages/driver/IncomingRequest.tsx`, `src/pages/driver/DriverHome.tsx`, `src/pages/driver/DriverActiveRide.tsx` (NEW) |
| **Payments** | `src/pages/customer/CustomerPayments.tsx`, `src/pages/driver/DriverEarnings.tsx` |
| **Admin** | `src/pages/admin/AdminUsers.tsx`, `src/pages/admin/AdminUserReview.tsx`, `src/pages/admin/AdminLiveMap.tsx` |
| **Core** | `src/services/api.ts` (NEW), `src/context/AuthContext.tsx` (NEW), `src/components/ProtectedRoute.tsx` (NEW) |
EOF`
