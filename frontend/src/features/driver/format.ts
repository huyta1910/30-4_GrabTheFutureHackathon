const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatDriverCurrency(value: number): string {
  return currencyFormatter.format(value);
}

const DRIVER_TRIP_STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  en_route: "En route",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function formatTripStatus(status: string): string {
  return DRIVER_TRIP_STATUS_LABELS[status] ?? status;
}

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDriverDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  return dateTimeFormatter.format(new Date(value));
}

/** Real road distance (meters) -> "1,2 km" / "850 m". */
export function formatDistance(meters: number | null): string {
  if (meters === null) {
    return "—";
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

/** Real road duration (seconds) -> "5 phút" / "1 giờ 12 phút". */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return "—";
  }
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
}
