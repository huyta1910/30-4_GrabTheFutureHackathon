import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDriverCurrency, formatTripStatus } from "@/features/driver/format";
import type { DriverTrip } from "@/features/driver/types";

interface ActiveTripCardProps {
  trip: DriverTrip | null;
}

export function ActiveTripCard({ trip }: ActiveTripCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active trip</CardTitle>
        <CardDescription>Your current ongoing trip.</CardDescription>
      </CardHeader>
      <CardContent>
        {trip ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Trip ID" value={trip.id} />
            <Detail label="Status" value={formatTripStatus(trip.status)} />
            <Detail label="Booking ID" value={trip.bookingId} />
            <Detail
              label="Fare"
              value={trip.totalFare === null ? "—" : formatDriverCurrency(trip.totalFare)}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No active trip right now.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-medium">{value}</span>
    </div>
  );
}
