import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usePassengerDashboard, useRideHistory, useRideStatus } from "@/features/passenger/hooks";

interface RideCompletedModalProps {
  passengerId: string;
}

type TerminalRideStatus = "completed" | "cancelled";

const ACTIVE_RIDE_STATUSES = new Set(["requested", "matching", "matched", "assigned", "in_progress"]);

export function RideCompletedModal({ passengerId }: RideCompletedModalProps) {
  const queryClient = useQueryClient();
  const rideStatus = useRideStatus(passengerId);
  const rideHistory = useRideHistory(passengerId);
  const dashboard = usePassengerDashboard(passengerId);
  const refetchRideHistory = rideHistory.refetch;
  const refetchDashboard = dashboard.refetch;
  const previousRideIdRef = useRef<string | null>(null);
  const shownTerminalBookingRef = useRef<string | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<TerminalRideStatus>("completed");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const currentRide = rideStatus.data?.current_ride ?? null;

    if (currentRide && ACTIVE_RIDE_STATUSES.has(currentRide.status)) {
      previousRideIdRef.current = currentRide.id;
      return;
    }

    const previousRideId = previousRideIdRef.current;
    if (previousRideId) {
      void refetchRideHistory();
      void refetchDashboard();
    }
  }, [refetchDashboard, refetchRideHistory, rideStatus.data]);

  useEffect(() => {
    const previousRideId = previousRideIdRef.current;
    const latestTerminalRide = rideHistory.data?.find(
      (ride) =>
        ride.booking_id === previousRideId &&
        (ride.status === "completed" || ride.status === "cancelled"),
    );

    if (
      previousRideId &&
      latestTerminalRide &&
      shownTerminalBookingRef.current !== latestTerminalRide.booking_id
    ) {
      shownTerminalBookingRef.current = latestTerminalRide.booking_id;
      previousRideIdRef.current = null;
      setTerminalStatus(latestTerminalRide.status as TerminalRideStatus);
      setIsOpen(true);
    }
  }, [rideHistory.data]);

  const handleClose = async () => {
    setIsOpen(false);
    await Promise.all([
      rideStatus.refetch(),
      rideHistory.refetch(),
      dashboard.refetch(),
      queryClient.invalidateQueries({ queryKey: ["passenger", passengerId] }),
    ]);
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          void handleClose();
          return;
        }
        setIsOpen(open);
      }}
      title={terminalStatus === "completed" ? "Ride Completed" : "Ride Cancelled"}
      description={
        terminalStatus === "completed"
          ? "Your trip has been completed. You can book a new ride now."
          : "Your driver cancelled this trip. You can book a new ride now."
      }
    >
      <div className="grid gap-4">
        <div
          className={
            terminalStatus === "completed"
              ? "flex items-center gap-3 rounded-md border bg-emerald-50 p-3 text-emerald-700"
              : "flex items-center gap-3 rounded-md border bg-amber-50 p-3 text-amber-700"
          }
        >
          {terminalStatus === "completed" ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5" aria-hidden="true" />
          )}
          <p className="text-sm font-medium">
            {terminalStatus === "completed"
              ? "Thanks for riding with Adaptive AI Ride Pooling."
              : "The request form has been refreshed for your next booking."}
          </p>
        </div>
        <Button type="button" onClick={() => void handleClose()}>
          Book another ride
        </Button>
      </div>
    </Modal>
  );
}
