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
