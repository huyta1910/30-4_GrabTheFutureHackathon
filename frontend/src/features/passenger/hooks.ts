import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { passengerApi } from "@/features/passenger/api";
import type { PassengerProfilePayload, RideRequestPayload } from "@/features/passenger/types";

const passengerKeys = {
  all: (passengerId: string) => ["passenger", passengerId] as const,
  dashboard: (passengerId: string) => [...passengerKeys.all(passengerId), "dashboard"] as const,
  profile: (passengerId: string) => [...passengerKeys.all(passengerId), "profile"] as const,
  rideStatus: (passengerId: string) => [...passengerKeys.all(passengerId), "ride-status"] as const,
  rideHistory: (passengerId: string) => [...passengerKeys.all(passengerId), "ride-history"] as const,
  notifications: (passengerId: string) => [...passengerKeys.all(passengerId), "notifications"] as const,
};

export function usePassengerDashboard(passengerId: string) {
  return useQuery({
    queryKey: passengerKeys.dashboard(passengerId),
    queryFn: () => passengerApi.getDashboard(passengerId),
    enabled: passengerId.length > 0,
  });
}

export function usePassengerProfile(passengerId: string) {
  return useQuery({
    queryKey: passengerKeys.profile(passengerId),
    queryFn: () => passengerApi.getProfile(passengerId),
    enabled: passengerId.length > 0,
  });
}

export function useRideStatus(passengerId: string) {
  return useQuery({
    queryKey: passengerKeys.rideStatus(passengerId),
    queryFn: () => passengerApi.getRideStatus(passengerId),
    enabled: passengerId.length > 0,
    refetchInterval: 15_000,
  });
}

export function useRideHistory(passengerId: string) {
  return useQuery({
    queryKey: passengerKeys.rideHistory(passengerId),
    queryFn: () => passengerApi.getRideHistory(passengerId),
    enabled: passengerId.length > 0,
  });
}

export function usePassengerNotifications(passengerId: string) {
  return useQuery({
    queryKey: passengerKeys.notifications(passengerId),
    queryFn: () => passengerApi.getNotifications(passengerId),
    enabled: passengerId.length > 0,
  });
}

export function useRequestRide(passengerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RideRequestPayload) => passengerApi.requestRide(passengerId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: passengerKeys.dashboard(passengerId) }),
        queryClient.invalidateQueries({ queryKey: passengerKeys.rideStatus(passengerId) }),
      ]);
    },
  });
}

export function useUpdatePassengerProfile(passengerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PassengerProfilePayload) => passengerApi.updateProfile(passengerId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: passengerKeys.dashboard(passengerId) }),
        queryClient.invalidateQueries({ queryKey: passengerKeys.profile(passengerId) }),
      ]);
    },
  });
}

export function useMarkPassengerNotificationRead(passengerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      passengerApi.markNotificationRead(passengerId, notificationId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: passengerKeys.dashboard(passengerId) }),
        queryClient.invalidateQueries({ queryKey: passengerKeys.notifications(passengerId) }),
      ]);
    },
  });
}

export function useNormalizeVietnamLocation() {
  return useMutation({
    mutationFn: (input: string) => passengerApi.normalizeVietnamLocation(input),
  });
}
