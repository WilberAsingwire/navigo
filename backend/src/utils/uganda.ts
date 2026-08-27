export const UG_CITIES = [
  "Kampala",
  "Wakiso",
  "Entebbe",
  "Jinja",
  "Mukono",
  "Mbarara",
  "Gulu",
  "Mbale",
  "Masaka",
  "Lira",
  "Fort Portal",
  "Arua",
] as const;

export const VEHICLE_TYPES = [
  { value: "boda", label: "Boda Boda (Motorcycle)" },
  { value: "car", label: "Special Hire (Car)" },
  { value: "van", label: "Matatu / Van" },
] as const;

/** Ugandan mobile: +256 7XX XXX XXX (MTN, Airtel, etc.) */
export function normalizeUgPhone(raw: string): string | null {
  let v = raw.trim().replace(/[\s\-().]/g, "");
  if (v.startsWith("+256")) {
    // already international
  } else if (v.startsWith("256")) {
    v = `+${v}`;
  } else if (v.startsWith("0")) {
    v = `+256${v.slice(1)}`;
  } else if (v.startsWith("7")) {
    v = `+256${v}`;
  }
  return /^\+2567\d{8}$/.test(v) ? v : null;
}

/** "+256772123456" -> "+256 772 123 456" */
export function prettyUgPhone(normalized: string): string {
  const m = normalized.match(/^\+256(\d{3})(\d{3})(\d{3})$/);
  return m ? `+256 ${m[1]} ${m[2]} ${m[3]}` : normalized;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
