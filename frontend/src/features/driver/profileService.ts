import { apiClient } from "@/services/api/client";
import { DRIVER_API } from "@/features/driver/constants";
import type { DriverAvailabilityStatus, DriverProfile, UpdateProfilePayload } from "@/features/driver/types";

interface RawDriverProfile {
  id: string;
  user_id: string;
  license_number: string;
  vehicle_label: string;
  availability_status: string;
  full_name: string;
  email: string;
}

function mapProfile(raw: RawDriverProfile): DriverProfile {
  return {
    id: raw.id,
    userId: raw.user_id,
    licenseNumber: raw.license_number,
    vehicleLabel: raw.vehicle_label,
    availabilityStatus: raw.availability_status as DriverAvailabilityStatus,
    fullName: raw.full_name,
    email: raw.email,
  };
}

export async function getDriverProfile(driverId: string): Promise<DriverProfile> {
  const { data } = await apiClient.get(DRIVER_API.profile(driverId));
  return mapProfile(data.data as RawDriverProfile);
}

export async function updateDriverProfile(
  driverId: string,
  payload: UpdateProfilePayload,
): Promise<DriverProfile> {
  const body: Record<string, string> = {};
  if (payload.vehicleLabel !== undefined) body.vehicle_label = payload.vehicleLabel;
  if (payload.fullName !== undefined) body.full_name = payload.fullName;
  const { data } = await apiClient.patch(DRIVER_API.profile(driverId), body);
  return mapProfile(data.data as RawDriverProfile);
}
