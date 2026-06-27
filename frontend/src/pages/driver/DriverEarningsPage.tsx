import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageTransition } from "@/components/motion/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EarningsBarChart } from "@/components/driver/earnings/EarningsBarChart";
import { EarningsSummaryCards } from "@/components/driver/earnings/EarningsSummaryCards";
import { DriverErrorState } from "@/components/driver/DriverErrorState";
import { DriverDashboardSkeleton } from "@/components/driver/DriverDashboardSkeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDriverEarnings } from "@/features/driver/hooks/useDriverEarnings";

export function DriverEarningsPage() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const driverId = searchParams.get("driverId") ?? session?.user.id;

  const [period, setPeriod] = useState<"week" | "month">("week");
  const { data, isPending, isError, error, refetch } = useDriverEarnings(driverId, period);

  return (
    <PageTransition>
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">Earnings</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Track your income over time.
            </p>
          </div>
          <div className="flex rounded-lg border bg-card p-1">
            {(["week", "month"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                ].join(" ")}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {!driverId ? (
          <DriverErrorState
            title="Unable to load earnings"
            message="No signed-in driver found."
            onRetry={() => refetch()}
          />
        ) : isPending ? (
          <DriverDashboardSkeleton />
        ) : isError ? (
          <DriverErrorState
            title="Unable to load earnings"
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        ) : (
          <>
            <EarningsSummaryCards data={data} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Daily breakdown — last {period === "week" ? "7" : "30"} days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EarningsBarChart daily={data.daily} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageTransition>
  );
}
