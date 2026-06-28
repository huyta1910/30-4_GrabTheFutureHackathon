import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MapLegend } from "@/components/driver/map/MapLegend";
import { RouteMap, type MapMarker } from "@/components/driver/map/RouteMap";
import { TripActions } from "@/components/driver/trip/TripActions";
import { TripStatusBadge } from "@/components/driver/trip/TripStatusBadge";
import { TripStatusStepper } from "@/components/driver/trip/TripStatusStepper";
import {
  formatDistance,
  formatDriverCurrency,
  formatDriverDateTime,
  formatDuration,
} from "@/features/driver/format";
import { isActiveTripStatus } from "@/features/driver/tripLifecycle";
import type { DriverTripDetail, DriverTripStatus } from "@/features/driver/types";

function buildTripMarkers(trip: DriverTripDetail): MapMarker[] {
  const markers: MapMarker[] = [];
  if (trip.pickup) {
    markers.push({ position: trip.pickup, kind: "pickup", label: trip.pickupLabel ?? "Pickup" });
  }
  if (trip.dropoff) {
    markers.push({ position: trip.dropoff, kind: "dropoff", label: trip.dropoffLabel ?? "Dropoff" });
  }
  if (trip.driverPosition) {
    markers.push({ position: trip.driverPosition, kind: "driver", label: "Vị trí của bạn" });
  }
  return markers;
}

interface TripCardProps {
  trip: DriverTripDetail;
  isPending: boolean;
  onAction: (tripId: string, next: DriverTripStatus) => void;
}

export function TripCard({ trip, isPending, onAction }: TripCardProps) {
  const fare = trip.totalFare ?? trip.estimatedFare;
  const tripMarkers = buildTripMarkers(trip);
  const showLiveMap = isActiveTripStatus(trip.status) && trip.route.length >= 2;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="truncate">{trip.pickupLabel ?? "Pickup"}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{trip.dropoffLabel ?? "Dropoff"}</span>
          </div>
          <TripStatusBadge status={trip.status} />
        </div>

        {isActiveTripStatus(trip.status) || trip.status === "completed" ? (
          <TripStatusStepper status={trip.status} />
        ) : null}

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            Fare:{" "}
            <span className="font-medium text-foreground">
              {fare === null ? "—" : formatDriverCurrency(fare)}
            </span>
          </span>
          <span>Requested: {formatDriverDateTime(trip.requestedAt)}</span>
          {trip.completedAt ? (
            <span>Completed: {formatDriverDateTime(trip.completedAt)}</span>
          ) : null}
          {trip.distanceM !== null ? (
            <span>
              Quãng đường:{" "}
              <span className="font-medium text-foreground">{formatDistance(trip.distanceM)}</span>
            </span>
          ) : null}
          {trip.durationS !== null ? (
            <span>
              Thời gian:{" "}
              <span className="font-medium text-foreground">{formatDuration(trip.durationS)}</span>
            </span>
          ) : null}
        </div>

        {showLiveMap ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              Live tracking
            </div>
            <RouteMap
              markers={tripMarkers}
              route={trip.route}
              congestionZones={trip.congestionZones}
              heightClass="h-64"
            />
            <MapLegend
              items={[
                { color: "#10b981", label: "Điểm đón" },
                { color: "#3b82f6", label: "Điểm trả" },
                { color: "#f59e0b", label: "Vị trí của bạn" },
                { color: "#ef4444", label: "Vùng ngập/kẹt" },
              ]}
            />
          </div>
        ) : null}

        <TripActions
          status={trip.status}
          isPending={isPending}
          onAction={(next) => onAction(trip.id, next)}
        />
      </CardContent>
    </Card>
  );
}
