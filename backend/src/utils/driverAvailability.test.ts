import { describe, expect, it } from 'vitest';
import { canReceiveBookings } from './driverAvailability';

describe('canReceiveBookings', () => {
  const approvedOnlineDriver = {
    isOnline: true,
    verificationStatus: 'approved',
    accountStatus: 'active',
  };

  it('allows an approved, active, online driver with no active trip', () => {
    expect(canReceiveBookings(approvedOnlineDriver, false)).toBe(true);
  });

  it('does not allow an offline driver', () => {
    expect(canReceiveBookings({ ...approvedOnlineDriver, isOnline: false }, false)).toBe(false);
  });

  it('does not allow an unapproved driver', () => {
    expect(canReceiveBookings({ ...approvedOnlineDriver, verificationStatus: 'pending' }, false)).toBe(false);
  });

  it('does not allow a suspended or banned driver', () => {
    expect(canReceiveBookings({ ...approvedOnlineDriver, accountStatus: 'suspended' }, false)).toBe(false);
    expect(canReceiveBookings({ ...approvedOnlineDriver, accountStatus: 'banned' }, false)).toBe(false);
  });

  it('does not allow a driver who already has an active trip', () => {
    expect(canReceiveBookings(approvedOnlineDriver, true)).toBe(false);
  });
});
