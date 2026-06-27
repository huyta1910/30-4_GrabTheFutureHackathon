import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "react-router-dom";
import { PageTransition } from "@/components/motion/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DriverErrorState } from "@/components/driver/DriverErrorState";
import { DriverDashboardSkeleton } from "@/components/driver/DriverDashboardSkeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDriverProfile } from "@/features/driver/hooks/useDriverProfile";
import { useUpdateProfile } from "@/features/driver/hooks/useUpdateProfile";

const schema = z.object({
  fullName: z.string().min(1, "Name is required"),
  vehicleLabel: z.string().min(1, "Vehicle label is required"),
});

type FormValues = z.infer<typeof schema>;

export function DriverProfilePage() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const driverId = searchParams.get("driverId") ?? session?.user.id;

  const { data: profile, isPending, isError, error, refetch } = useDriverProfile(driverId);
  const updateMutation = useUpdateProfile(driverId ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (profile) {
      reset({ fullName: profile.fullName, vehicleLabel: profile.vehicleLabel });
    }
  }, [profile, reset]);

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate({
      fullName: values.fullName,
      vehicleLabel: values.vehicleLabel,
    });
  };

  return (
    <PageTransition>
      <div className="mx-auto grid w-full max-w-2xl gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">Profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            View and update your driver information.
          </p>
        </div>

        {!driverId ? (
          <DriverErrorState
            title="Unable to load profile"
            message="No signed-in driver found."
            onRetry={() => refetch()}
          />
        ) : isPending ? (
          <DriverDashboardSkeleton />
        ) : isError ? (
          <DriverErrorState
            title="Unable to load profile"
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account info</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{profile.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">License</span>
                  <span>{profile.licenseNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="capitalize">{profile.availabilityStatus}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Edit profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="fullName" className="text-sm font-medium">Full name</label>
                    <Input id="fullName" {...register("fullName")} />
                    {errors.fullName ? (
                      <p className="text-xs text-destructive">{errors.fullName.message}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="vehicleLabel" className="text-sm font-medium">Vehicle</label>
                    <Input id="vehicleLabel" {...register("vehicleLabel")} />
                    {errors.vehicleLabel ? (
                      <p className="text-xs text-destructive">{errors.vehicleLabel.message}</p>
                    ) : null}
                  </div>
                  {updateMutation.isSuccess ? (
                    <p className="text-sm text-emerald-600">Profile updated.</p>
                  ) : null}
                  {updateMutation.isError ? (
                    <p className="text-sm text-destructive">
                      {updateMutation.error instanceof Error
                        ? updateMutation.error.message
                        : "Update failed."}
                    </p>
                  ) : null}
                  <Button
                    type="submit"
                    disabled={!isDirty || updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageTransition>
  );
}
