import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageTransition } from "@/components/motion/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { DriverErrorState } from "@/components/driver/DriverErrorState";
import { TripCard } from "@/components/driver/trip/TripCard";
import { TripLiveIndicator } from "@/components/driver/trip/TripLiveIndicator";
import { TripListSkeleton } from "@/components/driver/trip/TripListSkeleton";
import {
  TRIP_FILTERS,
  TripStatusFilter,
  type TripFilterKey,
} from "@/components/driver/trip/TripStatusFilter";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDriverTrips } from "@/features/driver/hooks/useDriverTrips";
import { useUpdateTripStatus } from "@/features/driver/hooks/useUpdateTripStatus";
import type { DriverTripStatus } from "@/features/driver/types";

export function DriverTripsPage() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const driverId = searchParams.get("driverId") ?? session?.user.id;

  const [filter, setFilter] = useState<TripFilterKey>("all");
  const statuses = useMemo(
    () => TRIP_FILTERS.find((item) => item.key === filter)?.statuses,
    [filter],
  );

  const tripsQuery = useDriverTrips(driverId, statuses);
  const statusMutation = useUpdateTripStatus(driverId ?? "");

  const handleAction = (tripId: string, next: DriverTripStatus) => {
    statusMutation.mutate({ tripId, status: next });
  };

  const trips = tripsQuery.data?.items ?? [];
  const isLive = Boolean(driverId) && !tripsQuery.isError && (filter === "all" || filter === "active");

  return (
    <PageTransition>
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">Trip Management</h1>
            <TripLiveIndicator dataUpdatedAt={tripsQuery.dataUpdatedAt} isLive={isLive} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your trip lifecycle from pickup to completion.
          </p>
        </div>

        <TripStatusFilter active={filter} onChange={setFilter} />

        {statusMutation.isError ? (
          <DriverErrorState
            title="Action failed"
            message={
              statusMutation.error instanceof Error ? statusMutation.error.message : undefined
            }
            onRetry={() => statusMutation.reset()}
          />
        ) : null}

        {!driverId ? (
          <DriverErrorState
            title="Unable to load trips"
            message="No signed-in driver found."
            onRetry={() => tripsQuery.refetch()}
          />
        ) : tripsQuery.isPending ? (
          <TripListSkeleton />
        ) : tripsQuery.isError ? (
          <DriverErrorState
            title="Unable to load trips"
            message={tripsQuery.error instanceof Error ? tripsQuery.error.message : undefined}
            onRetry={() => tripsQuery.refetch()}
          />
        ) : trips.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No trips found for this filter.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                isPending={statusMutation.isPending}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
