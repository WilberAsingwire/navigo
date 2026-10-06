/**
 * NAVIGO PRICING ENGINE — researched & calibrated for Kampala (2026).
 *
 * Market anchors (research, 2025-2026):
 *  - Street boda: 1-3km ≈ UGX 1,000 | 4-6km ≈ 2,000 | 7-10km ≈ 3,000 | long 5k-20k
 *  - Uber BODA:   min 1,500, base 500, 450/km, 70/min, cancellation 1,500
 *  - Special hire: 15,000-20,000 to most destinations
 *  - Petrol: ~UGX 5,800-7,000/L (2026) + UGX 200/L fuel levy (June 2026)
 *  - Competitor commission: Bolt 20%, Uber 20-25%, SafeBoda 15%, Union 10%
 *
 * NAVIGO doctrine ("nobody gets cheated"):
 *  1. NO SURGE — Kampala traffic is compensated by the per-minute component,
 *     so the quoted price is the final price.
 *  2. Round DOWN to the nearest 100 (customer-friendly).
 *  3. First 500m free (covered by the base fare).
 *  4. Flat 10% commission — half of Bolt's.
 *  5. Tips go 100% to the driver.
 *  6. Mobile-money payout fee absorbed by NAVIGO.
 */

export type VehicleType = "boda" | "economy" | "comfort" | "xl";

export interface VehicleSpec {
  type: VehicleType;
  name: string;
  tagline: string;
  base: number;
  perKm: number;
  perMin: number;
  deliveryFee: number;
  min: number;
  seats: string;
  pickupEtaMin: [number, number];
}

export const VEHICLES: VehicleSpec[] = [
  {
    type: "boda",
    name: "NAVIGO Boda",
    tagline: "Fastest way across town",
    base: 800,
    perKm: 450,
    perMin: 45,
    deliveryFee: 500,
    min: 1500,
    seats: "1 passenger",
    pickupEtaMin: [2, 5],
  },
  {
    type: "economy",
    name: "NAVIGO Go",
    tagline: "Affordable everyday rides",
    base: 1500,
    perKm: 750,
    perMin: 70,
    deliveryFee: 1000,
    min: 3000,
    seats: "Up to 4 passengers",
    pickupEtaMin: [4, 9],
  },
  {
    type: "comfort",
    name: "NAVIGO Comfort",
    tagline: "Newer cars, top drivers",
    base: 2500,
    perKm: 950,
    perMin: 90,
    deliveryFee: 1500,
    min: 5000,
    seats: "Up to 4 passengers",
    pickupEtaMin: [5, 12],
  },
  {
    type: "xl",
    name: "NAVIGO XL",
    tagline: "Extra space for groups",
    base: 4000,
    perKm: 1300,
    perMin: 110,
    deliveryFee: 2000,
    min: 8000,
    seats: "Up to 6 passengers",
    pickupEtaMin: [6, 15],
  },
];

export const COMMISSION_RATE: number = Math.min(
  0.2,
  Math.max(0.05, Number(process.env.NAVIGO_COMMISSION_RATE ?? 0.1))
);

export const FREE_FIRST_KM = 0.5;

// Unified alias map — frontend sends go/boda/comfort/xl, backend uses economy as canonical for Go
const VEHICLE_ALIASES: Record<string, VehicleType> = {
  boda: "boda",
  go: "economy",
  economy: "economy",
  standard: "economy",
  car: "economy",
  van: "xl",
  comfort: "comfort",
  xl: "xl",
};

export function getVehicle(type: string): VehicleSpec {
  const key = (type || "").toLowerCase().trim();
  const normalized = VEHICLE_ALIASES[key] || (VEHICLES.find(v => v.type === key)?.type as VehicleType) || "economy";
  return VEHICLES.find(v => v.type === normalized) ?? VEHICLES[1];
}

export function normalizeVehicleForDB(type: string): string {
  return getVehicle(type).type;
}

export interface FareBreakdown {
  base: number;
  distance: number;
  time: number;
  deliveryFee: number;
  total: number;
  driverShare: number;
  commission: number;
}

const roundDown100 = (n: number) => Math.floor(n / 100) * 100;

export function fareBreakdown(
  type: string,
  km: number,
  min: number = 0,
  serviceType: "ride" | "delivery" = "ride"
): FareBreakdown {
  const v = getVehicle(type);
  const billableKm = Math.max(0, km - FREE_FIRST_KM);

  const base = v.base;
  const distance = Math.round(billableKm * v.perKm);
  const time = Math.round(min * v.perMin);
  const deliveryFee = serviceType === "delivery" ? v.deliveryFee : 0;

  let total = Math.max(v.min, base + distance + time + deliveryFee);
  total = roundDown100(total);

  const commission = Math.round(total * COMMISSION_RATE);
  const driverShare = total - commission;

  return { base, distance, time, deliveryFee, total, driverShare, commission };
}

export function fareQuote(type: string, km: number, min: number = 0, serviceType: "ride" | "delivery" = "ride"): number {
  return fareBreakdown(type, km, min, serviceType).total;
}

export function clampOffer(
  type: string,
  km: number,
  min: number,
  offer: number,
  serviceType: "ride" | "delivery" = "ride"
): number {
  const rec = fareQuote(type, km, min, serviceType);
  const minBound = Math.round((rec * 0.65) / 100) * 100;
  const maxBound = Math.round((rec * 1.5) / 100) * 100;
  return Math.min(maxBound, Math.max(minBound, Math.round(offer / 100) * 100));
}

export function offerBounds(
  type: string,
  km: number,
  min: number,
  serviceType: "ride" | "delivery" = "ride"
): { min: number; max: number } {
  const rec = fareQuote(type, km, min, serviceType);
  return {
    min: Math.round((rec * 0.65) / 100) * 100,
    max: Math.round((rec * 1.5) / 100) * 100,
  };
}

export function driverShare(fare: number): number {
  return fare - Math.round(fare * COMMISSION_RATE);
}

export function formatUGX(n: number): string {
  return `UGX ${Math.abs(Math.round(n)).toLocaleString("en-UG")}`;
}
