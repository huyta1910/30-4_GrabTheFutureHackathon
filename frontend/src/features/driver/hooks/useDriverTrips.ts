import { useQuery } from "@tanstack/react-query";
import { driverQueryKeys } from "@/features/driver/constants";
import { getDriverTrips } from "@/features/driver/tripService";
import type { DriverTripStatus } from "@/features/driver/types";

const ACTIVE_STATUSES = new Set<DriverTripStatus>(["assigned", "en_route", "in_progress"]);

export function useDriverTrips(
  driverId: string | undefined,
  status?: DriverTripStatus[],
) {
  const statusKey = status && status.length > 0 ? status.join(",") : undefined;
  const live = !status || status.some((s) => ACTIVE_STATUSES.has(s));

  return useQuery({
    queryKey: driverQueryKeys.trips(driverId ?? "unknown", statusKey),
    queryFn: () => getDriverTrips(driverId as string, status),
    enabled: Boolean(driverId),
    refetchInterval: live ? 10_000 : false,
    refetchIntervalInBackground: false,
  });
}
