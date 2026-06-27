import { apiClient } from "@/services/api/client";
import { DRIVER_API } from "@/features/driver/constants";
import { toNumber } from "@/features/driver/mappers";
import type { DailyEarning, EarningsSummary } from "@/features/driver/types";

interface RawDailyEarning {
  date: string;
  amount: string | number;
  trip_count: number;
}

interface RawEarningsSummary {
  period: string;
  total: string | number;
  trip_count: number;
  average_per_trip: string | number;
  daily: RawDailyEarning[];
}

function mapDailyEarning(raw: RawDailyEarning): DailyEarning {
  return {
    date: raw.date,
    amount: toNumber(raw.amount),
    tripCount: raw.trip_count,
  };
}

function mapEarnings(raw: RawEarningsSummary): EarningsSummary {
  return {
    period: raw.period as "week" | "month",
    total: toNumber(raw.total),
    tripCount: raw.trip_count,
    averagePerTrip: toNumber(raw.average_per_trip),
    daily: raw.daily.map(mapDailyEarning),
  };
}

export async function getDriverEarnings(
  driverId: string,
  period: "week" | "month" = "week",
): Promise<EarningsSummary> {
  const { data } = await apiClient.get(DRIVER_API.earnings(driverId), {
    params: { period },
  });
  return mapEarnings(data.data as RawEarningsSummary);
}
