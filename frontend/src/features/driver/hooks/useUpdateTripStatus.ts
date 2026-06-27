import { useMutation, useQueryClient } from "@tanstack/react-query";
import { driverQueryKeys } from "@/features/driver/constants";
import { updateTripStatus } from "@/features/driver/tripService";
import type { DriverTripStatus } from "@/features/driver/types";

interface UpdateTripStatusVariables {
  tripId: string;
  status: DriverTripStatus;
}

export function useUpdateTripStatus(driverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tripId, status }: UpdateTripStatusVariables) =>
      updateTripStatus(driverId, tripId, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.all });
    },
  });
}
