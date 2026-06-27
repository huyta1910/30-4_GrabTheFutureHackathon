export interface ApiResponse<TData> {
  success: boolean;
  message: string;
  data: TData;
}

export interface PassengerProfile {
  id: string;
  user_id: string;
  display_name: string;
  updated_at: string;
}

export interface RideRequest {
  id: string;
  passenger_id: string;
  pickup_label: string;
  dropoff_label: string;
  status: RideStatusName;
  requested_at: string;
  estimated_fare: string | null;
}

export interface RideStatus {
  current_ride: RideRequest | null;
  next_step: string;
}

export interface RideHistoryItem {
  id: string;
  booking_id: string;
  pickup_label: string;
  dropoff_label: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
  total_fare: string | null;
}

export interface PassengerNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  status: "read" | "unread" | string;
  created_at: string;
}

export interface PassengerDashboard {
  profile: PassengerProfile;
  current_ride: RideRequest | null;
  recent_rides: RideHistoryItem[];
  notifications: PassengerNotification[];
}

export interface RideRequestPayload {
  pickup_label: string;
  dropoff_label: string;
}

export interface PassengerProfilePayload {
  display_name: string;
}

export type RideStatusName = "requested" | "matching" | "assigned" | "in_progress" | string;

export interface VietnamAdministrativeLocation {
  province: string;
  commune_or_ward: string;
  administrative_code: string;
  confidence: number;
}

export type LocationNormalizationStatus =
  | "success"
  | "ambiguous"
  | "need_clarification"
  | "not_found";

export interface LocationNormalizationResult {
  status: LocationNormalizationStatus;
  input: string;
  normalized_input: string;
  matched_location: VietnamAdministrativeLocation | null;
  reasoning: string;
  alternatives: VietnamAdministrativeLocation[];
}
