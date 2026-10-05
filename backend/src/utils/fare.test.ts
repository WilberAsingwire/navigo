import { describe, it, expect } from 'vitest';
import {
  VEHICLES, COMMISSION_RATE, FREE_FIRST_KM,
  getVehicle, normalizeVehicleForDB, fareBreakdown, fareQuote,
  clampOffer, offerBounds, driverShare, formatUGX,
} from './fare';

describe('vehicle normalization', () => {
  it('maps frontend aliases onto canonical DB types', () => {
    expect(normalizeVehicleForDB('go')).toBe('economy');
    expect(normalizeVehicleForDB('standard')).toBe('economy');
    expect(normalizeVehicleForDB('car')).toBe('economy');
    expect(normalizeVehicleForDB('van')).toBe('xl');
    expect(normalizeVehicleForDB('boda')).toBe('boda');
    expect(normalizeVehicleForDB('comfort')).toBe('comfort');
  });

  it('falls back to economy for unknown or empty types', () => {
    expect(getVehicle('rocketship').type).toBe('economy');
    expect(getVehicle('').type).toBe('economy');
  });

  it('is case/whitespace insensitive', () => {
    expect(getVehicle('  BODA ').type).toBe('boda');
  });
});

describe('commission', () => {
  it('is clamped to the 5–20% policy band', () => {
    expect(COMMISSION_RATE).toBeGreaterThanOrEqual(0.05);
    expect(COMMISSION_RATE).toBeLessThanOrEqual(0.2);
  });

  it('driverShare + commission always reassemble the fare exactly', () => {
    for (const fare of [1500, 3000, 12700, 99900, 2000000]) {
      const share = driverShare(fare);
      const commission = Math.round(fare * COMMISSION_RATE);
      expect(share + commission).toBe(fare);
      expect(share).toBeLessThan(fare);
      expect(share).toBeGreaterThan(0);
    }
  });
});

describe('fareBreakdown', () => {
  it('never quotes below the vehicle minimum', () => {
    for (const v of VEHICLES) {
      expect(fareQuote(v.type, 0.1)).toBeGreaterThanOrEqual(v.min);
    }
  });

  it('rounds the total down to a clean 100 UGX', () => {
    for (const v of VEHICLES) {
      expect(fareQuote(v.type, 7.3, 21) % 100).toBe(0);
    }
  });

  it('does not charge distance within the free first 500 m', () => {
    const atFree = fareBreakdown('boda', FREE_FIRST_KM, 0);
    expect(atFree.distance).toBe(0);
    const beyond = fareBreakdown('boda', FREE_FIRST_KM + 1, 0);
    expect(beyond.distance).toBe(VEHICLES[0].perKm); // exactly 1 billable km
  });

  it('adds the delivery fee only for deliveries', () => {
    const ride = fareBreakdown('economy', 5, 15, 'ride');
    const delivery = fareBreakdown('economy', 5, 15, 'delivery');
    expect(ride.deliveryFee).toBe(0);
    expect(delivery.deliveryFee).toBeGreaterThan(0);
    expect(delivery.total).toBeGreaterThanOrEqual(ride.total);
  });

  it('breakdown components are internally consistent', () => {
    const b = fareBreakdown('comfort', 8, 20);
    expect(b.driverShare + b.commission).toBe(b.total);
    expect(b.total).toBeGreaterThanOrEqual(b.base);
  });

  it('longer trips cost more', () => {
    expect(fareQuote('economy', 20, 40)).toBeGreaterThan(fareQuote('economy', 3, 8));
  });
});

describe('fare bargaining (clampOffer)', () => {
  const type = 'economy';
  const km = 6;
  const min = 15;

  it('accepts an offer within bounds (rounded to 100)', () => {
    const rec = fareQuote(type, km, min);
    expect(clampOffer(type, km, min, rec)).toBe(Math.round(rec / 100) * 100);
  });

  it('clamps lowball and overpay offers to the 65%–150% band', () => {
    const { min: lo, max: hi } = offerBounds(type, km, min);
    expect(clampOffer(type, km, min, 100)).toBe(lo);
    expect(clampOffer(type, km, min, 10_000_000)).toBe(hi);
  });

  it('bounds are sane: min < recommended < max', () => {
    const rec = fareQuote(type, km, min);
    const { min: lo, max: hi } = offerBounds(type, km, min);
    expect(lo).toBeLessThan(rec);
    expect(hi).toBeGreaterThan(rec);
  });
});

describe('formatUGX', () => {
  it('formats with thousands separators', () => {
    expect(formatUGX(12500)).toBe('UGX 12,500');
  });
  it('shows magnitude for negative ledger amounts', () => {
    expect(formatUGX(-4000)).toBe('UGX 4,000');
  });
});
