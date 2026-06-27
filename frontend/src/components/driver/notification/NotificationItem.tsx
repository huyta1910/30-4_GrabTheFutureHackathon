import { Bell, CloudRain } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatDriverDateTime } from "@/features/driver/format";
import type { DriverNotification } from "@/features/driver/types";

interface NotificationItemProps {
  notification: DriverNotification;
  onMarkRead: (id: string) => void;
}

function isWeatherNotification(title: string) {
  return /mưa|rain|weather|thời tiết|ngập/i.test(title);
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const unread = notification.status === "unread";
  const isWeather = isWeatherNotification(notification.title);

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4 transition-colors",
        unread ? "border-primary/20 bg-primary/5" : "bg-card",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isWeather ? "bg-blue-100 text-blue-600" : "bg-muted text-muted-foreground",
        )}
      >
        {isWeather ? <CloudRain className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm", unread ? "font-semibold" : "font-medium")}>
            {notification.title}
          </p>
          {unread ? (
            <button
              type="button"
              onClick={() => onMarkRead(notification.id)}
              className="shrink-0 text-xs text-primary hover:underline"
            >
              Mark read
            </button>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{notification.body}</p>
        <p className="text-xs text-muted-foreground">
          {formatDriverDateTime(notification.createdAt)}
        </p>
      </div>
    </div>
  );
}
