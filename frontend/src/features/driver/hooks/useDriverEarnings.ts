import { useQuery } from "@tanstack/react-query";
import { driverQueryKeys } from "@/features/driver/constants";
import { getDriverEarnings } from "@/features/driver/earningsService";

export function useDriverEarnings(
  driverId: string | undefined,
  period: "week" | "month" = "week",
) {
  return useQuery({
    queryKey: driverQueryKeys.earnings(driverId ?? "unknown", period),
    queryFn: () => getDriverEarnings(driverId as string, period),
    enabled: Boolean(driverId),
  });
}
