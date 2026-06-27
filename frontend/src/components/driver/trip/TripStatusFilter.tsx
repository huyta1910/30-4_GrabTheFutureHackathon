import { cn } from "@/utils/cn";
import type { DriverTripStatus } from "@/features/driver/types";

export type TripFilterKey = "all" | "active" | "completed" | "cancelled";

export const TRIP_FILTERS: { key: TripFilterKey; label: string; statuses?: DriverTripStatus[] }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active", statuses: ["assigned", "en_route", "in_progress"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

interface TripStatusFilterProps {
  active: TripFilterKey;
  onChange: (key: TripFilterKey) => void;
}

export function TripStatusFilter({ active, onChange }: TripStatusFilterProps) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
      {TRIP_FILTERS.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => onChange(filter.key)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            active === filter.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
