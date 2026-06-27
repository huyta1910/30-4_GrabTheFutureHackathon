import { Clock, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCancelCurrentRide, useRideStatus } from "@/features/passenger/hooks";
import { StatusPill } from "@/components/passenger/StatusPill";

interface RideStatusPanelProps {
  passengerId: string;
}

export function RideStatusPanel({ passengerId }: RideStatusPanelProps) {
  const rideStatus = useRideStatus(passengerId);
  const cancelRide = useCancelCurrentRide(passengerId);

  if (rideStatus.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ride status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (rideStatus.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ride status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Ride status is unavailable.</p>
        </CardContent>
      </Card>
    );
  }

  const statusData = rideStatus.data;
  const currentRide = statusData?.current_ride;
  const nextStep = statusData?.next_step ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ride status</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {currentRide ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <StatusPill status={currentRide.status} />
              <span className="text-sm text-muted-foreground">
                {new Date(currentRide.requested_at).toLocaleTimeString()}
              </span>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex gap-2">
                <Route className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span>
                  {currentRide.pickup_label} to {currentRide.dropoff_label}
                </span>
              </div>
              <div className="flex gap-2 text-muted-foreground">
                <Clock className="mt-0.5 h-4 w-4" aria-hidden="true" />
                <span>{nextStep}</span>
              </div>
            </div>
            {["requested", "matching"].includes(currentRide.status) ? (
              <div className="grid gap-2">
                {cancelRide.isError ? (
                  <p className="text-sm text-destructive">Ride could not be cancelled.</p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cancelRide.mutate()}
                  disabled={cancelRide.isPending}
                >
                  {cancelRide.isPending ? "Cancelling..." : "Cancel current ride"}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{nextStep}</p>
        )}
      </CardContent>
    </Card>
  );
}
