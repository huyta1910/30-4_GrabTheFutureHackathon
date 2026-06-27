import { useMutation, useQueryClient } from "@tanstack/react-query";
import { driverQueryKeys } from "@/features/driver/constants";
import { updateDriverProfile } from "@/features/driver/profileService";
import type { UpdateProfilePayload } from "@/features/driver/types";

export function useUpdateProfile(driverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      updateDriverProfile(driverId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: driverQueryKeys.profile(driverId),
      });
    },
  });
}
