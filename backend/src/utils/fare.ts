export type VehicleType = "boda" | "economy" | "comfort" | "xl";

export interface VehicleSpec {
  type: VehicleType;
  name: string;
  tagline: string;
  base: number;
  perKm: number;
  perMin: number;
  surgeMultiplier: number;
  min: number;
  seats: string;
  pickupEtaMin: [number, number]; // display range
}

export const VEHICLES: VehicleSpec[] = [
  {
    type: "boda",
    name: "Navigo Boda",
    tagline: "Fastest way across town",
    base: 1500,
    perKm: 600,
    perMin: 80,
    surgeMultiplier: 1.0,
    min: 2000,
    seats: "1 passenger",
    pickupEtaMin: [2, 5],
  },
  {
    type: "economy",
    name: "NAVIGO Go",
    tagline: "Affordable everyday rides",
    base: 2000,
    perKm: 900,
    perMin: 100,
    surgeMultiplier: 1.0,
    min: 3000,
    seats: "Up to 4 passengers",
    pickupEtaMin: [4, 9],
  },
  {
    type: "comfort",
    name: "NAVIGO Comfort",
    tagline: "Newer cars, top drivers",
    base: 4000,
    perKm: 1200,
    perMin: 150,
    surgeMultiplier: 1.2,
    min: 5000,
    seats: "Up to 4 passengers",
    pickupEtaMin: [5, 12],
  },
  {
    type: "xl",
    name: "NAVIGO XL",
    tagline: "Extra space for groups",
    base: 6000,
    perKm: 1800,
    perMin: 200,
    surgeMultiplier: 1.1,
    min: 8000,
    seats: "Up to 6 passengers",
    pickupEtaMin: [6, 15],
  },
];

export function getVehicle(type: string): VehicleSpec {
  const normalizedType = type === 'go' ? 'economy' : type;
  return VEHICLES.find((v) => v.type === normalizedType) ?? VEHICLES[0];
}

/** Recommended fare in UGX, rounded to nearest 100. */
export function fareQuote(type: string, km: number, min: number = 0): number {
  const v = getVehicle(type);
  const distFare = Math.round(km * v.perKm);
  const timeFare = Math.round(min * v.perMin);
  const base = v.base;
  const surge = Math.round((base + distFare + timeFare) * (v.surgeMultiplier - 1));
  const raw = Math.max(v.min, base + distFare + timeFare + surge);
  return Math.round(raw / 100) * 100;
}

export function clampOffer(type: string, km: number, min: number, offer: number): number {
  const rec = fareQuote(type, km, min);
  const minBound = Math.round((rec * 0.65) / 100) * 100;
  const maxBound = Math.round((rec * 1.5) / 100) * 100;
  return Math.min(maxBound, Math.max(minBound, Math.round(offer / 100) * 100));
}

export function offerBounds(type: string, km: number, min: number): { min: number; max: number } {
  const rec = fareQuote(type, km, min);
  return {
    min: Math.round((rec * 0.65) / 100) * 100,
    max: Math.round((rec * 1.5) / 100) * 100,
  };
}

export function formatUGX(n: number): string {
  return `UGX ${Math.abs(Math.round(n)).toLocaleString("en-UG")}`;
}

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function formatDuration(min: number): string {
  if (min < 1) return "<1 min";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${Math.round(min % 60)}m`;
}

/** Captain keeps 90% — the fairest split in Uganda. */
export function captainShare(fare: number): number {
  return Math.round(fare * 0.9);
}
