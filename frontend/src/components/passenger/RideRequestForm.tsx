import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Navigation } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VietnamLocationField } from "@/components/passenger/VietnamLocationField";
import { useRequestRide } from "@/features/passenger/hooks";
import {
  rideRequestSchema,
  type RideRequestFormValues,
} from "@/features/passenger/validation";

interface RideRequestFormProps {
  passengerId: string;
  disabled?: boolean;
}

export function RideRequestForm({ passengerId, disabled = false }: RideRequestFormProps) {
  const requestRide = useRequestRide(passengerId);
  const form = useForm<RideRequestFormValues>({
    resolver: zodResolver(rideRequestSchema),
    defaultValues: {
      pickup_label: "",
      dropoff_label: "",
      pickup_latitude: null,
      pickup_longitude: null,
      dropoff_latitude: null,
      dropoff_longitude: null,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await requestRide.mutateAsync(values);
    form.reset();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request a ride</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <VietnamLocationField
              label="Pickup"
              icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
              value={form.watch("pickup_label")}
              onChange={(value) => form.setValue("pickup_label", value, { shouldValidate: true })}
              onCoordinatesChange={(coordinates) => {
                form.setValue("pickup_latitude", coordinates?.latitude ?? null);
                form.setValue("pickup_longitude", coordinates?.longitude ?? null);
              }}
              placeholder="Current location or pickup area"
              disabled={disabled || requestRide.isPending}
              error={form.formState.errors.pickup_label?.message}
            />
          </div>
          <div className="grid gap-2">
            <VietnamLocationField
              label="Dropoff"
              icon={<Navigation className="h-4 w-4" aria-hidden="true" />}
              value={form.watch("dropoff_label")}
              onChange={(value) => form.setValue("dropoff_label", value, { shouldValidate: true })}
              onCoordinatesChange={(coordinates) => {
                form.setValue("dropoff_latitude", coordinates?.latitude ?? null);
                form.setValue("dropoff_longitude", coordinates?.longitude ?? null);
              }}
              placeholder="Destination"
              disabled={disabled || requestRide.isPending}
              error={form.formState.errors.dropoff_label?.message}
            />
          </div>
          {requestRide.isError ? (
            <p className="text-sm text-destructive">Ride request could not be created.</p>
          ) : null}
          <Button type="submit" disabled={disabled || requestRide.isPending}>
            {requestRide.isPending ? "Requesting..." : "Find pooled ride"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
