import { useQuery } from "@tanstack/react-query";
import { driverQueryKeys } from "@/features/driver/constants";
import { getPoolSuggestions } from "@/features/driver/poolService";

export function usePoolSuggestions(driverId: string | undefined) {
  return useQuery({
    queryKey: driverQueryKeys.poolSuggestions(driverId ?? "unknown"),
    queryFn: () => getPoolSuggestions(driverId as string),
    enabled: Boolean(driverId),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}
