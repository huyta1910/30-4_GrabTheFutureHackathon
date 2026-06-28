import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, CloudRain, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMarkPassengerNotificationRead } from "@/features/passenger/hooks";
import type { PassengerNotification } from "@/features/passenger/types";
import { isPassengerWeatherAlertNotification } from "@/features/passenger/weatherAlerts";

const RIDE_REQUEST_SECTION_ID = "passenger-ride-request";
const WEATHER_ALERT_SUMMARY = "Book now before demand rises and pickup times slow down.";
const WEATHER_ALERT_TIPS = [
  {
    icon: Clock3,
    label: "Book early",
  },
  {
    icon: MapPin,
    label: "Covered pickup",
  },
];

interface WeatherAlertModalProps {
  passengerId: string;
  notifications: PassengerNotification[];
}

interface AcknowledgeOptions {
  focusRideRequest?: boolean;
}

export function WeatherAlertModal({ notifications, passengerId }: WeatherAlertModalProps) {
  const markRead = useMarkPassengerNotificationRead(passengerId);
  const [isOpen, setIsOpen] = useState(false);

  const weatherAlert = useMemo(
    () =>
      notifications.find(
        (notification) =>
          notification.status !== "read" && isPassengerWeatherAlertNotification(notification),
      ) ?? null,
    [notifications],
  );
  const weatherAlertId = weatherAlert?.id ?? null;

  useEffect(() => {
    if (!weatherAlertId) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
  }, [weatherAlertId]);

  const handleAcknowledge = ({ focusRideRequest = false }: AcknowledgeOptions = {}) => {
    if (weatherAlert) {
      markRead.mutate(weatherAlert.id);
    }

    setIsOpen(false);

    if (focusRideRequest) {
      window.setTimeout(() => {
        document
          .getElementById(RIDE_REQUEST_SECTION_ID)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  };

  if (!weatherAlert) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleAcknowledge();
          return;
        }
        setIsOpen(open);
      }}
    >
      <DialogContent className="max-w-[420px] overflow-hidden border-0 p-0 shadow-2xl">
        <div className="bg-card">
          <div className="flex items-center gap-4 bg-emerald-950 p-5 text-white">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-white/10">
              <CloudRain className="h-8 w-8" aria-hidden="true" />
            </div>
            <DialogHeader className="gap-1 text-left">
              <DialogTitle className="text-xl leading-tight">Rain is coming soon</DialogTitle>
              <DialogDescription className="text-sm text-white/80">
                {WEATHER_ALERT_SUMMARY}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 p-5">
            <div className="grid grid-cols-2 gap-2">
              {WEATHER_ALERT_TIPS.map((tip) => {
                const Icon = tip.icon;

                return (
                  <div
                    key={tip.label}
                    className="flex min-h-12 items-center gap-2 rounded-md border bg-muted/50 px-3 text-sm font-medium"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 truncate">{tip.label}</span>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={() => handleAcknowledge({ focusRideRequest: true })}
              disabled={markRead.isPending}
            >
              Book before rain
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
