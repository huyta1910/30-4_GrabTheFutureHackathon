import { useQuery } from "@tanstack/react-query";
import { driverQueryKeys } from "@/features/driver/constants";
import { getDriverDashboard } from "@/features/driver/driverService";

export function useDriverDashboard(driverId: string | undefined) {
  return useQuery({
    queryKey: driverQueryKeys.dashboard(driverId ?? "unknown"),
    queryFn: () => getDriverDashboard(driverId as string),
    enabled: Boolean(driverId),
  });
}
