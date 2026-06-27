import { useSearchParams } from "react-router-dom";
import { PageTransition } from "@/components/motion/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationItem } from "@/components/driver/notification/NotificationItem";
import { DriverErrorState } from "@/components/driver/DriverErrorState";
import { TripListSkeleton } from "@/components/driver/trip/TripListSkeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDriverNotifications } from "@/features/driver/hooks/useDriverNotifications";
import { useMarkNotificationRead } from "@/features/driver/hooks/useMarkNotificationRead";

export function DriverNotificationsPage() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const driverId = searchParams.get("driverId") ?? session?.user.id;

  const notifQuery = useDriverNotifications(driverId);
  const markReadMutation = useMarkNotificationRead(driverId ?? "");

  const notifications = notifQuery.data?.items ?? [];
  const unreadCount = notifQuery.data?.unreadCount ?? 0;

  return (
    <PageTransition>
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
              Notifications
            </h1>
            {unreadCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {unreadCount}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Weather alerts and demand zone updates.
          </p>
        </div>

        {!driverId ? (
          <DriverErrorState
            title="Unable to load notifications"
            message="No signed-in driver found."
            onRetry={() => notifQuery.refetch()}
          />
        ) : notifQuery.isPending ? (
          <TripListSkeleton />
        ) : notifQuery.isError ? (
          <DriverErrorState
            title="Unable to load notifications"
            message={
              notifQuery.error instanceof Error ? notifQuery.error.message : undefined
            }
            onRetry={() => notifQuery.refetch()}
          />
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={(id) => markReadMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
