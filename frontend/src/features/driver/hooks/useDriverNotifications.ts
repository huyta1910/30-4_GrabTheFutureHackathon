import { useQuery } from "@tanstack/react-query";
import { driverQueryKeys } from "@/features/driver/constants";
import { getDriverNotifications } from "@/features/driver/notificationService";

export function useDriverNotifications(driverId: string | undefined) {
  return useQuery({
    queryKey: driverQueryKeys.notifications(driverId ?? "unknown"),
    queryFn: () => getDriverNotifications(driverId as string),
    enabled: Boolean(driverId),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
