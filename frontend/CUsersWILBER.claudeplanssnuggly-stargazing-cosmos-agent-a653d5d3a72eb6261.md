# Design Plan: Ride Lifecycle, Wallet Settlement, and UI Polish

This plan details the implementation of the ride lifecycle completion, wallet settlement system, payment validation, and UI enhancements for a premium experience.

## 1. Ride Lifecycle Completion & Wallet Settlement

### Goal
Ensure that when a ride is marked as 'completed', the payment is processed and recorded.

### Implementation Steps
- **Create Settlement Utility**: Implement `backend/src/utils/settlement.ts`.
    - Function `settlePayment(rideId: string)`:
        - Fetch ride details from `rides` table.
        - If `paymentMethod === 'wallet'`:
            - Begin DB transaction.
            - Check rider balance one last time.
            - Deduct `fareFinal` from rider's wallet.
            - Add `fareFinal` to driver's wallet.
            - Insert rider transaction (`kind: 'ride_payment'`, negative amount).
            - Insert driver transaction (`kind: 'ride_payment'`, positive amount).
            - Update ride: `settled = true`, `completedAt = CURRENT_TIMESTAMP`.
            - Commit transaction.
        - If `paymentMethod === 'cash'`:
            - Update ride: `settled = true`, `completedAt = CURRENT_TIMESTAMP`.
- **Integrate into Socket Handler**:
    - Modify `backend/src/socket/socketHandler.ts`.
    - In `update-status` event, if `status === 'completed'`, call `settlePayment(rideId)`.
    - Emit a `payment-settled` event to both rider and driver if wallet payment was successful.

## 2. Payment Validation

### Goal
Prevent riders from requesting rides with 'wallet' payment if they have insufficient funds.

### Implementation Steps
- **Modify Ride Request Route**:
    - Update `backend/src/routes/rides.ts` in the `/request` POST handler.
    - If `paymentMethod === 'wallet'`:
        - Fetch rider's wallet balance.
        - If `balance < fareRecommended`, return `400 Bad Request` with a message like "Insufficient wallet balance".

## 3. Dynamic Home Data & Frontend Integration

### Goal
Replace hardcoded data with real ride history and allow wallet payment selection.

### Implementation Steps
- **Implement Recent Rides API**:
    - Add `GET /api/rides/recent` to `backend/src/routes/rides.ts`.
    - Query: `SELECT * FROM rides WHERE userId = ? AND status = 'completed' ORDER BY completedAt DESC LIMIT 3`.
- **Update Ride Request UI**:
    - Modify `frontend/src/pages/rider/RideRequest.tsx`.
    - Replace hardcoded "Recent Trips" with a call to `/api/rides/recent`.
    - Add a payment method selector (Cash vs Wallet) in the `BookingStep.PAYMENT` stage.
    - Update the `handleBookRide` call to send the selected `paymentMethod`.

## 4. UI/UX Polish (Premium Experience)

### Goal
Apply a cohesive 'Premium' aesthetic (glassmorphism, amber accents, ambient glows) across dashboards.

### Implementation Steps
- **Customer Dashboard Polish**:
    - Update `frontend/src/pages/rider/CustomerDashboard.tsx` and `CustomerDashboard.css`.
    - Implement `backdrop-filter: blur(10px)` for cards.
    - Use semi-transparent backgrounds (e.g., `rgba(255, 255, 255, 0.05)`).
    - Add subtle radial gradients to the page background for ambient glow.
    - Use amber (`#FF6B35` or `#FF5A1F`) for primary actions.
- **Driver Home Polish**:
    - Update `frontend/src/pages/driver/DriverHome.tsx` and `DriverHome.css`.
    - Apply similar glassmorphism and amber accent styles.
    - Ensure KPI cards and recent activity items have a refined, high-contrast dark theme.
- **Consistency Check**:
    - Verify icon sizes and colors are uniform across all rider and driver pages.

## Critical Files for Implementation
- `backend/src/socket/socketHandler.ts`
- `backend/src/routes/rides.ts`
- `backend/src/utils/settlement.ts` (To be created)
- `frontend/src/pages/rider/RideRequest.tsx`
- `frontend/src/pages/rider/CustomerDashboard.tsx`
- `frontend/src/pages/driver/DriverHome.tsx`
