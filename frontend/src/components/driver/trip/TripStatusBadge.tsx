import { cn } from "@/utils/cn";
import { formatTripStatus } from "@/features/driver/format";
import type { DriverTripStatus } from "@/features/driver/types";

const STATUS_STYLES: Record<DriverTripStatus, string> = {
  assigned: "bg-amber-100 text-amber-700",
  en_route: "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-muted text-muted-foreground",
};

interface TripStatusBadgeProps {
  status: DriverTripStatus;
}

export function TripStatusBadge({ status }: TripStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {formatTripStatus(status)}
    </span>
  );
}
