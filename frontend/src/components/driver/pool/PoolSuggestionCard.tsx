import { ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapLegend } from "@/components/driver/map/MapLegend";
import { RouteMap, type MapMarker } from "@/components/driver/map/RouteMap";
import {
  formatDistance,
  formatDriverCurrency,
  formatDriverDateTime,
  formatDuration,
} from "@/features/driver/format";
import type { PoolSuggestion } from "@/features/driver/types";

interface PoolSuggestionCardProps {
  suggestion: PoolSuggestion;
  isPending: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

function buildMarkers(suggestion: PoolSuggestion): MapMarker[] {
  const markers: MapMarker[] = [];
  for (const p of suggestion.passengers) {
    if (p.pickup) {
      markers.push({
        position: p.pickup,
        kind: "pickup",
        order: p.stopOrder,
        label: `Đón ${p.stopOrder}: ${p.pickupLabel}`,
      });
    }
    if (p.dropoff) {
      markers.push({
        position: p.dropoff,
        kind: "dropoff",
        order: p.stopOrder,
        label: `Trả ${p.stopOrder}: ${p.dropoffLabel}`,
      });
    }
  }
  return markers;
}

export function PoolSuggestionCard({
  suggestion,
  isPending,
  onAccept,
  onDecline,
}: PoolSuggestionCardProps) {
  const isResponded = suggestion.status !== "pending";
  const markers = buildMarkers(suggestion);
  const hasMap = markers.length > 0;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              AI Pool · {suggestion.passengers.length} passengers
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDriverDateTime(suggestion.createdAt)}
          </span>
        </div>

        {suggestion.originArea || suggestion.destinationArea ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{suggestion.originArea ?? "—"}</span>
            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="font-medium">{suggestion.destinationArea ?? "—"}</span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          {suggestion.passengers.map((p, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md bg-background px-3 py-2 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {p.stopOrder}
              </span>
              <span className="truncate text-muted-foreground">{p.pickupLabel}</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{p.dropoffLabel}</span>
              {p.estimatedFare !== null ? (
                <span className="ml-auto shrink-0 text-xs font-medium">
                  {formatDriverCurrency(p.estimatedFare)}
                </span>
              ) : null}
            </div>
          ))}
        </div>

        {hasMap ? (
          <div className="flex flex-col gap-2">
            <RouteMap
              markers={markers}
              route={suggestion.route}
              congestionZones={suggestion.congestionZones}
              heightClass="h-72"
            />
            <MapLegend
              items={[
                { color: "#10b981", label: "Điểm đón" },
                { color: "#3b82f6", label: "Điểm trả" },
                { color: "#6366f1", label: "Tuyến né kẹt (AI)" },
                { color: "#ef4444", label: "Vùng ngập/kẹt" },
              ]}
            />
          </div>
        ) : null}

        {suggestion.distanceM !== null || suggestion.durationS !== null ? (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {suggestion.distanceM !== null ? (
              <span>
                Quãng đường:{" "}
                <span className="font-medium text-foreground">
                  {formatDistance(suggestion.distanceM)}
                </span>
              </span>
            ) : null}
            {suggestion.durationS !== null ? (
              <span>
                Thời gian:{" "}
                <span className="font-medium text-foreground">
                  {formatDuration(suggestion.durationS)}
                </span>
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total estimated</span>
          <span className="text-lg font-semibold">
            {formatDriverCurrency(suggestion.totalEstimatedFare)}
          </span>
        </div>
      </CardContent>

      {!isResponded ? (
        <div className="flex gap-2 px-5 pb-5">
          <Button
            className="flex-1"
            disabled={isPending}
            onClick={() => onAccept(suggestion.id)}
          >
            Accept pool
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={isPending}
            onClick={() => onDecline(suggestion.id)}
          >
            Decline
          </Button>
        </div>
      ) : (
        <div className="px-5 pb-5">
          <span className="text-sm text-muted-foreground capitalize">
            Pool {suggestion.status}
          </span>
        </div>
      )}
    </Card>
  );
}
