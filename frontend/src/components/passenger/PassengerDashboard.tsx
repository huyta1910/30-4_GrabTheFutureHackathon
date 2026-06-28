import { CarFront, ReceiptText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationsPanel } from "@/components/passenger/NotificationsPanel";
import { PassengerProfilePanel } from "@/components/passenger/PassengerProfilePanel";
import { RideCompletedModal } from "@/components/passenger/RideCompletedModal";
import { RideHistoryList } from "@/components/passenger/RideHistoryList";
import { RideRequestForm } from "@/components/passenger/RideRequestForm";
import { RideStatusPanel } from "@/components/passenger/RideStatusPanel";
import { StatusPill } from "@/components/passenger/StatusPill";
import { WeatherAlertModal } from "@/components/passenger/WeatherAlertModal";
import { usePassengerDashboard } from "@/features/passenger/hooks";
import { isPassengerWeatherAlertNotification } from "@/features/passenger/weatherAlerts";

interface PassengerDashboardProps {
  passengerId: string;
}

export function PassengerDashboard({ passengerId }: PassengerDashboardProps) {
  const dashboard = usePassengerDashboard(passengerId);
  const dashboardNotifications = dashboard.data?.notifications ?? [];
  const unreadStandardNotificationCount = dashboardNotifications.filter(
    (notification) =>
      notification.status !== "read" && !isPassengerWeatherAlertNotification(notification),
  ).length;

  return (
    <div className="grid gap-6">
      <RideCompletedModal passengerId={passengerId} />
      <WeatherAlertModal passengerId={passengerId} notifications={dashboardNotifications} />
      <section className="grid gap-4 md:grid-cols-3">
        {dashboard.isLoading ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : null}
        {dashboard.isError ? (
          <Card className="md:col-span-3">
            <CardContent className="p-6">
              <p className="text-sm text-destructive">Passenger dashboard could not be loaded.</p>
            </CardContent>
          </Card>
        ) : null}
        {dashboard.data ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CarFront className="h-5 w-5" aria-hidden="true" />
                  Current ride
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.data.current_ride ? (
                  <div className="grid gap-2">
                    <StatusPill status={dashboard.data.current_ride.status} />
                    <p className="text-sm text-muted-foreground">
                      {dashboard.data.current_ride.pickup_label} to{" "}
                      {dashboard.data.current_ride.dropoff_label}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active ride request.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-5 w-5" aria-hidden="true" />
                  Recent rides
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{dashboard.data.recent_rides.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Unread alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{unreadStandardNotificationCount}</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </section>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-6">
          <div id="passenger-ride-request">
            <RideRequestForm
              passengerId={passengerId}
              disabled={Boolean(dashboard.data?.current_ride)}
            />
          </div>
          <RideStatusPanel passengerId={passengerId} />
          <RideHistoryList passengerId={passengerId} />
        </div>
        <div className="grid content-start gap-6">
          <PassengerProfilePanel passengerId={passengerId} />
          <NotificationsPanel passengerId={passengerId} />
        </div>
      </section>
    </div>
  );
}
