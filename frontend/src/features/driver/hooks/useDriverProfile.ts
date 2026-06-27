import { useQuery } from "@tanstack/react-query";
import { driverQueryKeys } from "@/features/driver/constants";
import { getDriverProfile } from "@/features/driver/profileService";

export function useDriverProfile(driverId: string | undefined) {
  return useQuery({
    queryKey: driverQueryKeys.profile(driverId ?? "unknown"),
    queryFn: () => getDriverProfile(driverId as string),
    enabled: Boolean(driverId),
  });
}
