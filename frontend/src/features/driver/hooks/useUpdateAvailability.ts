import { useMutation, useQueryClient } from "@tanstack/react-query";
import { driverQueryKeys } from "@/features/driver/constants";
import { updateDriverAvailability } from "@/features/driver/driverService";
import type { UpdateAvailabilityPayload } from "@/features/driver/types";

export function useUpdateAvailability(driverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateAvailabilityPayload) =>
      updateDriverAvailability(driverId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: driverQueryKeys.dashboard(driverId),
      });
    },
  });
}
