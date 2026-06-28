import { apiClient } from "@/services/api/client";
import type { ApiResponse } from "@/types/api";
import { DRIVER_API } from "@/features/driver/constants";
import { mapTrip, type RawDriverTrip } from "@/features/driver/driverService";
import {
  mapCongestionZones,
  mapGeoPoint,
  mapGeoPoints,
  toNullableNumber,
} from "@/features/driver/mappers";
import type {
  DriverTripDetail,
  DriverTripStatus,
  PaginatedTrips,
  UpdateTripStatusPayload,
} from "@/features/driver/types";

interface RawGeo {
  lat: number;
  lng: number;
}

interface RawDriverTripDetail extends RawDriverTrip {
  pickup_label: string | null;
  dropoff_label: string | null;
  requested_at: string | null;
  estimated_fare: string | number | null;
  pickup: RawGeo | null;
  dropoff: RawGeo | null;
  driver_position: RawGeo | null;
  route: RawGeo[];
  distance_m: number | null;
  duration_s: number | null;
  congestion_zones: {
    lat: number;
    lng: number;
    radius_m: number;
    severity: string;
    label: string | null;
  }[];
}

interface RawPaginatedTrips {
  items: RawDriverTripDetail[];
  page: number;
  page_size: number;
  total: number;
}

function mapTripDetail(raw: RawDriverTripDetail): DriverTripDetail {
  return {
    ...mapTrip(raw),
    pickupLabel: raw.pickup_label,
    dropoffLabel: raw.dropoff_label,
    requestedAt: raw.requested_at,
    estimatedFare: toNullableNumber(raw.estimated_fare),
    pickup: mapGeoPoint(raw.pickup),
    dropoff: mapGeoPoint(raw.dropoff),
    driverPosition: mapGeoPoint(raw.driver_position),
    route: mapGeoPoints(raw.route),
    distanceM: raw.distance_m ?? null,
    durationS: raw.duration_s ?? null,
    congestionZones: mapCongestionZones(raw.congestion_zones),
  };
}

export async function getDriverTrips(
  driverId: string,
  status?: DriverTripStatus[],
): Promise<PaginatedTrips> {
  // Repeat the `status` key (status=a&status=b) so FastAPI parses a list query.
  const params = new URLSearchParams();
  status?.forEach((value) => params.append("status", value));

  const { data } = await apiClient.get<ApiResponse<RawPaginatedTrips>>(
    DRIVER_API.trips(driverId),
    { params },
  );
  const raw = data.data;
  return {
    items: raw.items.map(mapTripDetail),
    page: raw.page,
    pageSize: raw.page_size,
    total: raw.total,
  };
}

export async function updateTripStatus(
  driverId: string,
  tripId: string,
  payload: UpdateTripStatusPayload,
): Promise<DriverTripDetail> {
  const { data } = await apiClient.patch<ApiResponse<RawDriverTripDetail>>(
    DRIVER_API.tripStatus(driverId, tripId),
    { status: payload.status },
  );
  return mapTripDetail(data.data);
}
