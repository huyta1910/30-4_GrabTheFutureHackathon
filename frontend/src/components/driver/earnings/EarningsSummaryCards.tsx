import { Card, CardContent } from "@/components/ui/card";
import { formatDriverCurrency } from "@/features/driver/format";
import type { EarningsSummary } from "@/features/driver/types";

interface EarningsSummaryCardsProps {
  data: EarningsSummary;
}

export function EarningsSummaryCards({ data }: EarningsSummaryCardsProps) {
  const items = [
    { label: "Total earnings", value: formatDriverCurrency(data.total) },
    { label: "Trips completed", value: String(data.tripCount) },
    { label: "Avg per trip", value: formatDriverCurrency(data.averagePerTrip) },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
