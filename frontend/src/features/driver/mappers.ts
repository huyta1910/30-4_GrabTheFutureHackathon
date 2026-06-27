/** Coerce a backend numeric value (often a Decimal serialized as string) to number. */
export function toNumber(value: string | number | null): number {
  if (value === null) {
    return 0;
  }
  return typeof value === "number" ? value : Number(value);
}

/** Same as toNumber but preserves null (for optional money fields). */
export function toNullableNumber(value: string | number | null): number | null {
  return value === null ? null : toNumber(value);
}

// --- Geo mappers (mock-AI contract) ---

import type { CongestionZone, GeoPoint } from "@/features/driver/types";

interface RawGeoPoint {
  lat: number;
  lng: number;
}

interface RawCongestionZone {
  lat: number;
  lng: number;
  radius_m: number;
  severity: string;
  label: string | null;
}

export function mapGeoPoint(raw: RawGeoPoint | null | undefined): GeoPoint | null {
  if (!raw) return null;
  return { lat: raw.lat, lng: raw.lng };
}

export function mapGeoPoints(raw: RawGeoPoint[] | null | undefined): GeoPoint[] {
  return (raw ?? []).map((p) => ({ lat: p.lat, lng: p.lng }));
}

export function mapCongestionZones(
  raw: RawCongestionZone[] | null | undefined,
): CongestionZone[] {
  return (raw ?? []).map((z) => ({
    lat: z.lat,
    lng: z.lng,
    radiusM: z.radius_m,
    severity: (z.severity as CongestionZone["severity"]) ?? "medium",
    label: z.label,
  }));
}
