import { useSearchParams } from "react-router-dom";
import { PageTransition } from "@/components/motion/PageTransition";
import { ActiveTripCard } from "@/components/driver/ActiveTripCard";
import { AvailabilityToggle } from "@/components/driver/AvailabilityToggle";
import { DriverErrorState } from "@/components/driver/DriverErrorState";
import { DriverDashboardSkeleton } from "@/components/driver/DriverDashboardSkeleton";
import { DriverStatsCards } from "@/components/driver/DriverStatsCards";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDriverDashboard } from "@/features/driver/hooks/useDriverDashboard";
import { useUpdateAvailability } from "@/features/driver/hooks/useUpdateAvailability";
import type { DriverAvailabilityStatus } from "@/features/driver/types";

export function DriverDashboardPage() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  // The demo session exposes the user id; the team maps user -> driver during seeding.
  // A `?driverId=` override lets us target a specific driver until that mapping lands.
  const driverId = searchParams.get("driverId") ?? session?.user.id;

  const dashboardQuery = useDriverDashboard(driverId);
  const availabilityMutation = useUpdateAvailability(driverId ?? "");

  const handleToggle = (next: DriverAvailabilityStatus) => {
    availabilityMutation.mutate({ availabilityStatus: next });
  };

  return (
    <PageTransition>
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">Driver Dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Track your availability, earnings, and active trip.
            </p>
          </div>
          {dashboardQuery.data ? (
            <AvailabilityToggle
              status={dashboardQuery.data.driver.availabilityStatus}
              isPending={availabilityMutation.isPending}
              onToggle={handleToggle}
            />
          ) : null}
        </header>

        {dashboardQuery.isPending && driverId ? <DriverDashboardSkeleton /> : null}

        {!driverId ? (
          <DriverErrorState
            title="Unable to load dashboard"
            message="No signed-in driver found."
            onRetry={() => dashboardQuery.refetch()}
          />
        ) : null}

        {dashboardQuery.isError ? (
          <DriverErrorState
            title="Unable to load dashboard"
            message={dashboardQuery.error instanceof Error ? dashboardQuery.error.message : undefined}
            onRetry={() => dashboardQuery.refetch()}
          />
        ) : null}

        {dashboardQuery.data ? (
          <>
            <DriverStatsCards stats={dashboardQuery.data.stats} />
            <ActiveTripCard trip={dashboardQuery.data.activeTrip} />
          </>
        ) : null}
      </div>
    </PageTransition>
  );
}
