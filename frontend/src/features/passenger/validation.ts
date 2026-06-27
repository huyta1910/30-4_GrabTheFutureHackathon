import { z } from "zod";

export const rideRequestSchema = z.object({
  pickup_label: z.string().min(3, "Pickup must be at least 3 characters.").max(255),
  dropoff_label: z.string().min(3, "Dropoff must be at least 3 characters.").max(255),
  pickup_latitude: z.number().min(-90).max(90).nullable().optional(),
  pickup_longitude: z.number().min(-180).max(180).nullable().optional(),
  dropoff_latitude: z.number().min(-90).max(90).nullable().optional(),
  dropoff_longitude: z.number().min(-180).max(180).nullable().optional(),
});

export const passengerProfileSchema = z.object({
  display_name: z.string().min(2, "Name must be at least 2 characters.").max(120),
});

export type RideRequestFormValues = z.infer<typeof rideRequestSchema>;
export type PassengerProfileFormValues = z.infer<typeof passengerProfileSchema>;
