import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import type { DriverAvailabilityStatus } from "@/features/driver/types";

interface AvailabilityToggleProps {
  status: DriverAvailabilityStatus;
  isPending: boolean;
  onToggle: (next: DriverAvailabilityStatus) => void;
}

export function AvailabilityToggle({ status, isPending, onToggle }: AvailabilityToggleProps) {
  const isOnline = status === "online";
  const next: DriverAvailabilityStatus = isOnline ? "offline" : "online";

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-2 text-sm font-medium">
        <span
          className={cn(
            "inline-block h-2.5 w-2.5 rounded-full",
            isOnline ? "bg-emerald-500" : "bg-muted-foreground/50",
          )}
        />
        {isOnline ? "Online" : "Offline"}
      </span>
      <Button
        variant={isOnline ? "outline" : "default"}
        size="sm"
        disabled={isPending}
        onClick={() => onToggle(next)}
      >
        {isPending ? "Updating..." : isOnline ? "Go offline" : "Go online"}
      </Button>
    </div>
  );
}
