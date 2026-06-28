import { apiClient } from "@/services/api/client";
import { DRIVER_API } from "@/features/driver/constants";
import {
  mapCongestionZones,
  mapGeoPoint,
  mapGeoPoints,
  toNullableNumber,
  toNumber,
} from "@/features/driver/mappers";
import type {
  PoolAction,
  PoolPassenger,
  PoolStop,
  PoolStopType,
  PoolSuggestion,
} from "@/features/driver/types";

interface RawGeo {
  lat: number;
  lng: number;
}

interface RawPoolStop {
  sequence: number;
  type: string;
  label: string;
  passenger_order: number;
  point: RawGeo | null;
  leg_route: RawGeo[];
}

interface RawPoolPassenger {
  pickup_label: string;
  dropoff_label: string;
  estimated_fare: string | number | null;
  stop_order: number;
  pickup: RawGeo | null;
  dropoff: RawGeo | null;
}

interface RawPoolSuggestion {
  id: string;
  status: string;
  origin_area: string | null;
  destination_area: string | null;
  passengers: RawPoolPassenger[];
  total_estimated_fare: string | number;
  created_at: string;
  driver_start: RawGeo | null;
  route: RawGeo[];
  congestion_zones: {
    lat: number;
    lng: number;
    radius_m: number;
    severity: string;
    label: string | null;
  }[];
  stops: RawPoolStop[];
}

function mapStop(raw: RawPoolStop): PoolStop {
  return {
    sequence: raw.sequence,
    type: (raw.type as PoolStopType) ?? "pickup",
    label: raw.label,
    passengerOrder: raw.passenger_order,
    point: mapGeoPoint(raw.point),
    legRoute: mapGeoPoints(raw.leg_route),
  };
}

function mapPassenger(raw: RawPoolPassenger): PoolPassenger {
  return {
    pickupLabel: raw.pickup_label,
    dropoffLabel: raw.dropoff_label,
    estimatedFare: toNullableNumber(raw.estimated_fare),
    stopOrder: raw.stop_order,
    pickup: mapGeoPoint(raw.pickup),
    dropoff: mapGeoPoint(raw.dropoff),
  };
}

function mapSuggestion(raw: RawPoolSuggestion): PoolSuggestion {
  return {
    id: raw.id,
    status: raw.status,
    originArea: raw.origin_area,
    destinationArea: raw.destination_area,
    passengers: raw.passengers.map(mapPassenger),
    totalEstimatedFare: toNumber(raw.total_estimated_fare),
    createdAt: raw.created_at,
    driverStart: mapGeoPoint(raw.driver_start),
    route: mapGeoPoints(raw.route),
    congestionZones: mapCongestionZones(raw.congestion_zones),
    stops: (raw.stops ?? []).map(mapStop),
  };
}

export async function getPoolSuggestions(driverId: string): Promise<PoolSuggestion[]> {
  const { data } = await apiClient.get(DRIVER_API.poolSuggestions(driverId));
  return (data.data as RawPoolSuggestion[]).map(mapSuggestion);
}

export async function getPoolSuggestion(
  driverId: string,
  groupId: string,
): Promise<PoolSuggestion> {
  const { data } = await apiClient.get(DRIVER_API.poolDetail(driverId, groupId));
  return mapSuggestion(data.data as RawPoolSuggestion);
}

export async function respondToPool(
  driverId: string,
  groupId: string,
  action: PoolAction,
): Promise<PoolSuggestion> {
  const { data } = await apiClient.patch(DRIVER_API.poolRespond(driverId, groupId), { action });
  return mapSuggestion(data.data as RawPoolSuggestion);
}

export async function completePool(
  driverId: string,
  groupId: string,
): Promise<PoolSuggestion> {
  const { data } = await apiClient.post(DRIVER_API.poolComplete(driverId, groupId));
  return mapSuggestion(data.data as RawPoolSuggestion);
}
