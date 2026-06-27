import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageTransition } from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/button";
import { DriverErrorState } from "@/components/driver/DriverErrorState";
import { PoolNavigation } from "@/components/driver/pool/PoolNavigation";
import { TripListSkeleton } from "@/components/driver/trip/TripListSkeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePoolSuggestion } from "@/features/driver/hooks/usePoolSuggestion";

export function DriverPoolNavigatePage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const [searchParams] = useSearchParams();
  const driverId = searchParams.get("driverId") ?? session?.user.id;

  const { data, isPending, isError, error, refetch } = usePoolSuggestion(driverId, groupId);

  const backToPool = () => {
    const suffix = searchParams.get("driverId")
      ? `?driverId=${searchParams.get("driverId")}`
      : "";
    navigate(`/dashboard/driver/pool${suffix}`);
  };

  return (
    <PageTransition>
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={backToPool}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Pools
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
              Định tuyến chuyến ghép
            </h1>
            {data ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {data.originArea ?? "—"} → {data.destinationArea ?? "—"} ·{" "}
                {data.passengers.length} hành khách
              </p>
            ) : null}
          </div>
        </div>

        {!driverId || !groupId ? (
          <DriverErrorState
            title="Không tải được chuyến ghép"
            message="Thiếu thông tin tài xế hoặc chuyến ghép."
            onRetry={() => refetch()}
          />
        ) : isPending ? (
          <TripListSkeleton />
        ) : isError ? (
          <DriverErrorState
            title="Không tải được chuyến ghép"
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        ) : data.stops.length === 0 ? (
          <DriverErrorState
            title="Chuyến ghép chưa có lộ trình"
            message="Không có điểm đón/trả nào để định tuyến."
            onRetry={() => refetch()}
          />
        ) : (
          <PoolNavigation suggestion={data} onComplete={backToPool} />
        )}
      </div>
    </PageTransition>
  );
}
