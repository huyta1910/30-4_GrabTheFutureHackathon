import { cn } from "@/utils/cn";

interface StatusPillProps {
  status: string;
}

const statusStyles: Record<string, string> = {
  requested: "border-amber-200 bg-amber-50 text-amber-700",
  matching: "border-blue-200 bg-blue-50 text-blue-700",
  matched: "border-violet-200 bg-violet-50 text-violet-700",
  assigned: "border-emerald-200 bg-emerald-50 text-emerald-700",
  in_progress: "border-indigo-200 bg-indigo-50 text-indigo-700",
  completed: "border-green-200 bg-green-50 text-green-700",
  read: "border-slate-200 bg-slate-50 text-slate-600",
  unread: "border-rose-200 bg-rose-50 text-rose-700",
};

// Passenger-facing labels — clearer than the raw lifecycle status.
const statusLabels: Record<string, string> = {
  requested: "Requested",
  matching: "Finding pool",
  matched: "Finding driver",
  assigned: "Driver assigned",
  in_progress: "On the way",
  completed: "Completed",
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
        statusStyles[status] ?? "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      {statusLabels[status] ?? status.replace("_", " ")}
    </span>
  );
}
