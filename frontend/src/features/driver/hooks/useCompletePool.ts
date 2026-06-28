import { useMutation, useQueryClient } from "@tanstack/react-query";
import { driverQueryKeys } from "@/features/driver/constants";
import { completePool } from "@/features/driver/poolService";

export function useCompletePool(driverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => completePool(driverId, groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: driverQueryKeys.all });
    },
  });
}
