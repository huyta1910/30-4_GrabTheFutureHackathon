import type { PassengerNotification } from "@/features/passenger/types";

const WEATHER_ALERT_KEYWORDS = ["weather", "rain", "storm", "flood", "mưa", "thời tiết", "ngập"];

export function isPassengerWeatherAlertNotification(notification: PassengerNotification) {
  const searchableText = `${notification.title} ${notification.body}`.toLowerCase();

  return WEATHER_ALERT_KEYWORDS.some((keyword) => searchableText.includes(keyword));
}
