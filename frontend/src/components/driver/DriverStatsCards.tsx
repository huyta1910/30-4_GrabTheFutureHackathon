import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDriverCurrency } from "@/features/driver/format";
import type { DriverDashboardStats } from "@/features/driver/types";

interface DriverStatsCardsProps {
  stats: DriverDashboardStats;
}

export function DriverStatsCards({ stats }: DriverStatsCardsProps) {
  const items = [
    { label: "Earnings today", value: formatDriverCurrency(stats.earningsToday) },
    { label: "Total earnings", value: formatDriverCurrency(stats.earningsTotal) },
    { label: "Completed trips", value: String(stats.completedTrips) },
    { label: "Total trips", value: String(stats.totalTrips) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-2xl">{item.value}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
      ))}
    </div>
  );
}
