import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMarkPassengerNotificationRead,
  usePassengerNotifications,
} from "@/features/passenger/hooks";
import { isPassengerWeatherAlertNotification } from "@/features/passenger/weatherAlerts";
import { StatusPill } from "@/components/passenger/StatusPill";

interface NotificationsPanelProps {
  passengerId: string;
}

export function NotificationsPanel({ passengerId }: NotificationsPanelProps) {
  const notifications = usePassengerNotifications(passengerId);
  const markRead = useMarkPassengerNotificationRead(passengerId);
  const visibleNotifications =
    notifications.data?.filter(
      (notification) =>
        notification.status === "read" || !isPassengerWeatherAlertNotification(notification),
    ) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" aria-hidden="true" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {notifications.isLoading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : null}
        {notifications.isError ? (
          <p className="text-sm text-destructive">Notifications could not be loaded.</p>
        ) : null}
        {notifications.data && visibleNotifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passenger notifications yet.</p>
        ) : null}
        {visibleNotifications.map((notification) => (
          <div key={notification.id} className="grid gap-2 rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{notification.title}</p>
                <p className="text-sm text-muted-foreground">{notification.body}</p>
              </div>
              <StatusPill status={notification.status} />
            </div>
            {notification.status !== "read" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => markRead.mutate(notification.id)}
                disabled={markRead.isPending}
              >
                Mark read
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
