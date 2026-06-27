import { useQuery } from "@tanstack/react-query";
import { driverQueryKeys } from "@/features/driver/constants";
import { getPoolSuggestion } from "@/features/driver/poolService";

export function usePoolSuggestion(
  driverId: string | undefined,
  groupId: string | undefined,
) {
  return useQuery({
    queryKey: driverQueryKeys.poolDetail(driverId ?? "unknown", groupId ?? "unknown"),
    queryFn: () => getPoolSuggestion(driverId as string, groupId as string),
    enabled: Boolean(driverId) && Boolean(groupId),
  });
}
