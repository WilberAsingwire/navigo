# Implementation Plan: Map-Centric Ride Request Experience

## Overview
Transform the current side-by-side Ride Request screen into a modern, map-centric experience featuring a full-screen map background and a floating glassmorphic bottom sheet. The UI will transition through states based on the `BookingStep` enum.

## Target Architecture
- **Background**: Full-viewport `NavigoMap`.
- **Overlay**: Floating Glassmorphic Bottom Sheet.
- **State Management**: `BookingStep` drives the content of the bottom sheet.

## Detailed Implementation Steps

### 1. CSS Refactor (`frontend/src/pages/rider/RideRequest.css`)
- [ ] **Layout Transformation**:
    - Update `.booking-page-wrapper` to `position: relative; height: 100vh; width: 100vw; overflow: hidden;`.
    - Remove `.booking-main-container` grid layout.
    - Set `.booking-map-section` to `position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;`.
- [ ] **Floating Bottom Sheet**:
    - Implement `.booking-bottom-sheet` with the following styles:
        - `position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);`
        - `width: 100%; max-width: 600px; z-index: 10;`
        - `background: rgba(18, 24, 36, 0.8); backdrop-filter: blur(20px);`
        - `border: 1px solid rgba(255, 255, 255, 0.1);`
        - `border-radius: 32px 32px 0 0; padding: 2rem;`
        - `box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);`
- [ ] **Header Repositioning**:
    - Change `.booking-header` to `position: absolute; top: 0; left: 0; width: 100%; z-index: 11;`.
    - Add glassmorphic background and padding to ensure visibility over the map.
- [ ] **Responsive Adjustments**:
    - Ensure the bottom sheet takes full width on mobile devices.
    - Refine margins and padding for different screen sizes.

### 2. UI Refactor (`frontend/src/pages/rider/RideRequest.tsx`)
- [ ] **Structural Reorganization**:
    - Move `NavigoMap` to be the first element in the return statement.
    - Wrap the form/selection logic inside a new `div` with className `booking-bottom-sheet`.
- [ ] **State-Driven Rendering**:
    - Implement a conditional rendering block based on the `step` state:
        - `BookingStep.LOCATION`: Render pickup and destination inputs.
        - `BookingStep.RIDE_TYPE`: Render the `vehicle-selection-grid`.
        - `BookingStep.PAYMENT`: Render fare review and promo code input.
        - `BookingStep.MATCHING`: Render the driver matching animation and progress.
- [ ] **Navigation Logic**:
    - Create a `goToStep(step: BookingStep)` helper function.
    - Implement "Next" buttons for each step:
        - `LOCATION` $\rightarrow$ `RIDE_TYPE` (once both locations are selected).
        - `RIDE_TYPE` $\rightarrow$ `PAYMENT` (once a ride option is selected).
        - `PAYMENT` $\rightarrow$ `MATCHING` (on `handleBookRide`).
    - Implement a "Back" button for the first three steps.
- [ ] **Search Integration**:
    - Ensure `searchResults` dropdown is correctly positioned within the `LOCATION` step of the bottom sheet.

### 3. UX & Design Polish
- [ ] **Enterprise Design System**:
    - Add a "drag handle" indicator at the top of the bottom sheet.
    - Use consistent `border-radius` (24px-32px) and `box-shadow` across all elements.
    - Ensure text contrast is optimal against the blurred background.
- [ ] **Transitions**:
    - Add simple CSS transitions for the bottom sheet's appearance and content changes.

## Critical Files for Implementation
- `frontend/src/pages/rider/RideRequest.tsx`
- `frontend/src/pages/rider/RideRequest.css`
- `frontend/src/components/NavigoMap.tsx` (if adjustments to height/width are needed)

## Potential Challenges
- **Z-Index Management**: Ensuring the header, bottom sheet, and search results are layered correctly over the map.
- **Input Focus**: Ensuring that focusing on an input doesn't trigger unexpected viewport shifts on mobile.
- **Map Interaction**: Confirming that map clicks still work correctly when the bottom sheet is present.
EOF`
