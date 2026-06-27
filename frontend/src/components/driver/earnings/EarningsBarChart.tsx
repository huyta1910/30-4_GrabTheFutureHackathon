import { formatDriverCurrency } from "@/features/driver/format";
import type { DailyEarning } from "@/features/driver/types";

interface EarningsBarChartProps {
  daily: DailyEarning[];
}

function shortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" });
}

export function EarningsBarChart({ daily }: EarningsBarChartProps) {
  if (daily.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No earnings data for this period.
      </div>
    );
  }

  const max = Math.max(...daily.map((d) => d.amount), 1);

  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-1 pt-4">
      {daily.map((entry) => {
        const pct = Math.round((entry.amount / max) * 100);
        return (
          <div key={entry.date} className="group flex min-w-[40px] flex-1 flex-col items-center gap-1">
            <span className="invisible text-[10px] text-muted-foreground group-hover:visible">
              {formatDriverCurrency(entry.amount)}
            </span>
            <div
              className="w-full rounded-t bg-primary transition-all"
              style={{ height: `${Math.max(pct, 4)}px`, minHeight: "4px", maxHeight: "120px" }}
              title={formatDriverCurrency(entry.amount)}
            />
            <span className="text-[10px] text-muted-foreground">{shortDate(entry.date)}</span>
          </div>
        );
      })}
    </div>
  );
}
