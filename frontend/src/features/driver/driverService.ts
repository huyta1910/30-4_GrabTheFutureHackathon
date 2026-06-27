import { apiClient } from "@/services/api/client";
import type { ApiResponse } from "@/types/api";
import { DRIVER_API } from "@/features/driver/constants";
import { toNumber } from "@/features/driver/mappers";
import type {
  Driver,
  DriverAvailabilityStatus,
  DriverDashboard,
  DriverTrip,
  DriverTripStatus,
  UpdateAvailabilityPayload,
} from "@/features/driver/types";

// Raw shapes returned by the backend (snake_case Pydantic models).
interface RawDriver {
  id: string;
  user_id: string;
  license_number: string;
  vehicle_label: string;
  availability_status: DriverAvailabilityStatus;
}

export interface RawDriverTrip {
  id: string;
  booking_id: string;
  driver_id: string | null;
  status: DriverTripStatus;
  total_fare: string | number | null;
  completed_at: string | null;
  created_at: string;
}

interface RawDriverDashboard {
  driver: RawDriver;
  stats: {
    total_trips: number;
    completed_trips: number;
    earnings_today: string | number;
    earnings_total: string | number;
  };
  active_trip: RawDriverTrip | null;
}

function mapDriver(raw: RawDriver): Driver {
  return {
    id: raw.id,
    userId: raw.user_id,
    licenseNumber: raw.license_number,
    vehicleLabel: raw.vehicle_label,
    availabilityStatus: raw.availability_status,
  };
}

export function mapTrip(raw: RawDriverTrip): DriverTrip {
  return {
    id: raw.id,
    bookingId: raw.booking_id,
    driverId: raw.driver_id,
    status: raw.status,
    totalFare: raw.total_fare === null ? null : toNumber(raw.total_fare),
    completedAt: raw.completed_at,
    createdAt: raw.created_at,
  };
}

function mapDashboard(raw: RawDriverDashboard): DriverDashboard {
  return {
    driver: mapDriver(raw.driver),
    stats: {
      totalTrips: raw.stats.total_trips,
      completedTrips: raw.stats.completed_trips,
      earningsToday: toNumber(raw.stats.earnings_today),
      earningsTotal: toNumber(raw.stats.earnings_total),
    },
    activeTrip: raw.active_trip ? mapTrip(raw.active_trip) : null,
  };
}

export async function getDriverDashboard(driverId: string): Promise<DriverDashboard> {
  const { data } = await apiClient.get<ApiResponse<RawDriverDashboard>>(
    DRIVER_API.dashboard(driverId),
  );
  return mapDashboard(data.data);
}

export async function updateDriverAvailability(
  driverId: string,
  payload: UpdateAvailabilityPayload,
): Promise<Driver> {
  const { data } = await apiClient.patch<ApiResponse<RawDriver>>(
    DRIVER_API.availability(driverId),
    { availability_status: payload.availabilityStatus },
  );
  return mapDriver(data.data);
}
