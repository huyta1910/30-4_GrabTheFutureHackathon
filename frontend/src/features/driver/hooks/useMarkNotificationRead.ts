import { useMutation, useQueryClient } from "@tanstack/react-query";
import { driverQueryKeys } from "@/features/driver/constants";
import { markNotificationRead } from "@/features/driver/notificationService";

export function useMarkNotificationRead(driverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationRead(driverId, notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: driverQueryKeys.notifications(driverId),
      });
    },
  });
}
