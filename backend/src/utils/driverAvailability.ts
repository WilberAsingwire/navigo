export interface DriverBookingState {
  isOnline: boolean;
  verificationStatus: string;
  accountStatus?: string | null;
}

/** A driver can receive a new request only while online, approved, active and not already assigned a trip. */
export const canReceiveBookings = (
  driver: DriverBookingState,
  hasActiveRide: boolean,
): boolean =>
  driver.isOnline === true &&
  driver.verificationStatus === 'approved' &&
  (driver.accountStatus || 'active') === 'active' &&
  !hasActiveRide;

interface AvailabilityDatabase {
  run(query: string, params?: any[]): Promise<unknown>;
}

/**
 * Recalculate the available flag after a trip reaches a terminal state.
 * Keep the driver available only when they deliberately remain online and
 * their account is still approved and active, with no other active assignment.
 */
export const syncDriverAvailability = async (
  db: AvailabilityDatabase,
  driverId: string | null | undefined,
): Promise<void> => {
  if (!driverId) return;

  await db.run(
    `UPDATE users
     SET isAvailable = (
       isOnline = TRUE
       AND verificationStatus = 'approved'
       AND COALESCE(status, 'active') = 'active'
       AND NOT EXISTS (
         SELECT 1
         FROM rides active_ride
         WHERE active_ride.driverId = users.id
           AND active_ride.status IN ('accepted', 'arrived', 'ongoing')
       )
     )
     WHERE id = ?`,
    [driverId],
  );
};
