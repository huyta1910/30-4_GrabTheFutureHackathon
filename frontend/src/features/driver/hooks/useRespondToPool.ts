import { useMutation, useQueryClient } from "@tanstack/react-query";
import { driverQueryKeys } from "@/features/driver/constants";
import { respondToPool } from "@/features/driver/poolService";
import type { PoolAction } from "@/features/driver/types";

interface RespondVariables {
  groupId: string;
  action: PoolAction;
}

export function useRespondToPool(driverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, action }: RespondVariables) =>
      respondToPool(driverId, groupId, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: driverQueryKeys.poolSuggestions(driverId),
      });
    },
  });
}
