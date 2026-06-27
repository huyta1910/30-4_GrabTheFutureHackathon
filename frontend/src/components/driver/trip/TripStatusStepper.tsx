import { Check } from "lucide-react";
import { cn } from "@/utils/cn";
import type { DriverTripStatus } from "@/features/driver/types";

const STEPS: { status: DriverTripStatus; label: string }[] = [
  { status: "assigned", label: "Assigned" },
  { status: "en_route", label: "En Route" },
  { status: "in_progress", label: "In Progress" },
  { status: "completed", label: "Done" },
];

const STEP_INDEX: Partial<Record<DriverTripStatus, number>> = {
  assigned: 0,
  en_route: 1,
  in_progress: 2,
  completed: 3,
};

interface TripStatusStepperProps {
  status: DriverTripStatus;
}

export function TripStatusStepper({ status }: TripStatusStepperProps) {
  const current = STEP_INDEX[status];
  if (current === undefined) return null;

  return (
    <div className="flex items-start">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.status} className="flex flex-1 items-start">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-medium transition-all",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted bg-background text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
              </div>
              <span
                className={cn(
                  "text-center text-[10px] leading-tight",
                  active ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <div
                className={cn("mt-3 h-0.5 flex-1", i < current ? "bg-primary" : "bg-muted")}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
