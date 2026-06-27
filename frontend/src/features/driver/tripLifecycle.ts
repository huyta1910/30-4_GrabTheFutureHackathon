import type { DriverTripStatus } from "@/features/driver/types";

export interface TripAction {
  /** Target status this action transitions the trip to. */
  status: DriverTripStatus;
  label: string;
  variant: "default" | "outline";
}

/**
 * Next available driver actions per current status. Mirrors the backend state
 * machine for UX only; the backend remains the source of truth.
 */
const TRIP_ACTIONS: Record<DriverTripStatus, TripAction[]> = {
  assigned: [
    { status: "en_route", label: "Start trip", variant: "default" },
    { status: "cancelled", label: "Cancel", variant: "outline" },
  ],
  en_route: [
    { status: "in_progress", label: "Picked up", variant: "default" },
    { status: "cancelled", label: "Cancel", variant: "outline" },
  ],
  in_progress: [{ status: "completed", label: "Complete trip", variant: "default" }],
  completed: [],
  cancelled: [],
};

export function getTripActions(status: DriverTripStatus): TripAction[] {
  return TRIP_ACTIONS[status] ?? [];
}

export function isActiveTripStatus(status: DriverTripStatus): boolean {
  return status === "assigned" || status === "en_route" || status === "in_progress";
}
