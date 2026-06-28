import { CloudRain, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useMarkPassengerNotificationRead,
  usePassengerDashboard,
} from "@/features/passenger/hooks";
import type { PassengerNotification } from "@/features/passenger/types";

interface WeatherAlertBannerProps {
  passengerId: string;
  onBookNow?: () => void;
}

function activeWeatherAlert(
  notifications: PassengerNotification[] | undefined,
): PassengerNotification | null {
  if (!notifications) return null;
  return (
    notifications.find(
      (n) => n.category === "weather_alert" && n.status !== "read",
    ) ?? null
  );
}

export function WeatherAlertBanner({ passengerId, onBookNow }: WeatherAlertBannerProps) {
  const dashboard = usePassengerDashboard(passengerId);
  const markRead = useMarkPassengerNotificationRead(passengerId);

  const alert = activeWeatherAlert(dashboard.data?.notifications);
  if (!alert) return null;

  const dismiss = () => markRead.mutate(alert.id);
  const bookNow = () => {
    markRead.mutate(alert.id);
    onBookNow?.();
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-4 shadow-sm">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <CloudRain className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div>
          <p className="font-semibold text-blue-900">{alert.title}</p>
          <p className="mt-0.5 text-sm text-blue-800">{alert.body}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={bookNow} disabled={markRead.isPending}>
            Đặt xe ngay
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={dismiss}
            disabled={markRead.isPending}
          >
            Bỏ qua
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        disabled={markRead.isPending}
        className="text-blue-400 transition-colors hover:text-blue-600"
        aria-label="Dismiss weather alert"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
