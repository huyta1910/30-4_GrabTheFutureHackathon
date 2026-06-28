export const DRIVER_API = {
  dashboard: (driverId: string) => `/drivers/${driverId}/dashboard`,
  availability: (driverId: string) => `/drivers/${driverId}/availability`,
  trips: (driverId: string) => `/drivers/${driverId}/trips`,
  tripStatus: (driverId: string, tripId: string) =>
    `/drivers/${driverId}/trips/${tripId}/status`,
  earnings: (driverId: string) => `/drivers/${driverId}/earnings`,
  poolSuggestions: (driverId: string) => `/drivers/${driverId}/pool-suggestions`,
  poolDetail: (driverId: string, groupId: string) =>
    `/drivers/${driverId}/pool-suggestions/${groupId}`,
  poolRespond: (driverId: string, groupId: string) =>
    `/drivers/${driverId}/pool-suggestions/${groupId}/respond`,
  poolComplete: (driverId: string, groupId: string) =>
    `/drivers/${driverId}/pool-suggestions/${groupId}/complete`,
  notifications: (driverId: string) => `/drivers/${driverId}/notifications`,
  notificationRead: (driverId: string, notificationId: string) =>
    `/drivers/${driverId}/notifications/${notificationId}/read`,
  profile: (driverId: string) => `/drivers/${driverId}/profile`,
} as const;

export const driverQueryKeys = {
  all: ["driver"] as const,
  dashboard: (driverId: string) => [...driverQueryKeys.all, "dashboard", driverId] as const,
  trips: (driverId: string, status?: string) =>
    [...driverQueryKeys.all, "trips", driverId, status ?? "all"] as const,
  earnings: (driverId: string, period: string) =>
    [...driverQueryKeys.all, "earnings", driverId, period] as const,
  poolSuggestions: (driverId: string) =>
    [...driverQueryKeys.all, "pool", driverId] as const,
  poolDetail: (driverId: string, groupId: string) =>
    [...driverQueryKeys.all, "pool", driverId, groupId] as const,
  notifications: (driverId: string) =>
    [...driverQueryKeys.all, "notifications", driverId] as const,
  profile: (driverId: string) =>
    [...driverQueryKeys.all, "profile", driverId] as const,
} as const;
