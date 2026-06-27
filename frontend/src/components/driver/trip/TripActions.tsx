import { Button } from "@/components/ui/button";
import { getTripActions } from "@/features/driver/tripLifecycle";
import type { DriverTripStatus } from "@/features/driver/types";

interface TripActionsProps {
  status: DriverTripStatus;
  isPending: boolean;
  onAction: (next: DriverTripStatus) => void;
}

export function TripActions({ status, isPending, onAction }: TripActionsProps) {
  const actions = getTripActions(status);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.status}
          variant={action.variant}
          size="sm"
          disabled={isPending}
          onClick={() => onAction(action.status)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
