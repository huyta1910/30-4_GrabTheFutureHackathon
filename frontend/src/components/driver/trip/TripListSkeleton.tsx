import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TripListSkeletonProps {
  count?: number;
}

export function TripListSkeleton({ count = 3 }: TripListSkeletonProps) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-8 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
