import { useMemo, useState } from "react";
import { Check, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapLegend } from "@/components/driver/map/MapLegend";
import { RouteMap, type MapMarker } from "@/components/driver/map/RouteMap";
import { cn } from "@/utils/cn";
import type { GeoPoint, PoolStop, PoolSuggestion } from "@/features/driver/types";

interface PoolNavigationProps {
  suggestion: PoolSuggestion;
  onComplete: () => void;
  isCompleting?: boolean;
}

function stopActionLabel(stop: PoolStop): string {
  return stop.type === "pickup"
    ? `Đã đến · Đón khách ${stop.passengerOrder}`
    : `Đã đến · Trả khách ${stop.passengerOrder}`;
}

export function PoolNavigation({
  suggestion,
  onComplete,
  isCompleting = false,
}: PoolNavigationProps) {
  const stops = suggestion.stops;
  const [currentIndex, setCurrentIndex] = useState(0);

  const isDone = currentIndex >= stops.length;
  const currentStop = stops[currentIndex] ?? null;

  // Driver position: start point before first stop, else the last completed stop.
  const driverPos: GeoPoint | null = useMemo(() => {
    if (currentIndex === 0) return suggestion.driverStart ?? stops[0]?.point ?? null;
    return stops[currentIndex - 1]?.point ?? null;
  }, [currentIndex, stops, suggestion.driverStart]);

  // Planned route: concatenate the road geometry of each remaining leg. Each
  // stop's legRoute is the path from the previous stop to that stop, so joining
  // them from the current target onward follows the real (AI) routing.
  const remainingRoute: GeoPoint[] = useMemo(() => {
    const pts: GeoPoint[] = [];
    for (let i = currentIndex; i < stops.length; i += 1) {
      pts.push(...stops[i].legRoute);
    }
    if (pts.length === 0 && driverPos) {
      pts.push(driverPos);
      for (let i = currentIndex; i < stops.length; i += 1) {
        const p = stops[i].point;
        if (p) pts.push(p);
      }
    }
    return pts;
  }, [driverPos, currentIndex, stops]);

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = [];
    stops.forEach((stop, i) => {
      if (!stop.point) return;
      const kind = i === currentIndex ? "target" : stop.type;
      list.push({
        position: stop.point,
        kind,
        order: stop.sequence,
        label: `${stop.type === "pickup" ? "Đón" : "Trả"} ${stop.passengerOrder}: ${stop.label}`,
      });
    });
    if (driverPos && !isDone) {
      list.push({ position: driverPos, kind: "driver", label: "Vị trí của bạn" });
    }
    return list;
  }, [stops, currentIndex, driverPos, isDone]);

  const advance = () => setCurrentIndex((i) => i + 1);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-2">
        <RouteMap
          markers={markers}
          route={isDone ? suggestion.route : remainingRoute}
          congestionZones={suggestion.congestionZones}
          heightClass="h-[420px]"
        />
        <MapLegend
          items={[
            { color: "#ef4444", label: "Điểm đến tiếp theo" },
            { color: "#10b981", label: "Điểm đón" },
            { color: "#3b82f6", label: "Điểm trả" },
            { color: "#f59e0b", label: "Vị trí của bạn" },
          ]}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Navigation className="h-4 w-4" />
            Định tuyến chuyến ghép
          </div>

          <ol className="flex flex-col gap-2">
            {stops.map((stop, i) => {
              const done = i < currentIndex;
              const active = i === currentIndex;
              return (
                <li
                  key={stop.sequence}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3 py-2 text-sm",
                    active && "border-red-300 bg-red-50",
                    done && "opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                      done ? "bg-emerald-500" : active ? "bg-red-500" : "bg-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : stop.sequence}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {stop.type === "pickup" ? "Đón" : "Trả"} khách {stop.passengerOrder}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {stop.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>

          {isDone ? (
            <div className="flex flex-col gap-3">
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Đã hoàn thành tất cả điểm đón/trả của chuyến ghép.
              </p>
              <Button onClick={onComplete} disabled={isCompleting}>
                {isCompleting ? "Đang hoàn tất…" : "Hoàn thành chuyến ghép"}
              </Button>
            </div>
          ) : (
            <Button onClick={advance}>
              {currentStop ? stopActionLabel(currentStop) : "Tiếp tục"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
