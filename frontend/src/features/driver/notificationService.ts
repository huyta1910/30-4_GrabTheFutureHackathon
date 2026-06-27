import { apiClient } from "@/services/api/client";
import { DRIVER_API } from "@/features/driver/constants";
import type {
  DriverNotification,
  NotificationStatus,
  PaginatedNotifications,
} from "@/features/driver/types";

interface RawNotification {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
}

interface RawPaginatedNotifications {
  items: RawNotification[];
  total: number;
  unread_count: number;
}

function mapNotification(raw: RawNotification): DriverNotification {
  return {
    id: raw.id,
    title: raw.title,
    body: raw.body,
    status: raw.status as NotificationStatus,
    createdAt: raw.created_at,
  };
}

export async function getDriverNotifications(
  driverId: string,
  page = 1,
): Promise<PaginatedNotifications> {
  const { data } = await apiClient.get(DRIVER_API.notifications(driverId), {
    params: { page, page_size: 20 },
  });
  const raw = data.data as RawPaginatedNotifications;
  return {
    items: raw.items.map(mapNotification),
    total: raw.total,
    unreadCount: raw.unread_count,
  };
}

export async function markNotificationRead(
  driverId: string,
  notificationId: string,
): Promise<DriverNotification> {
  const { data } = await apiClient.patch(
    DRIVER_API.notificationRead(driverId, notificationId),
  );
  return mapNotification(data.data as RawNotification);
}
