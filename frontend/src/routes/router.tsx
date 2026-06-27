import { createBrowserRouter, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { DriverDashboardPage } from "@/pages/driver/DriverDashboardPage";
import { DriverEarningsPage } from "@/pages/driver/DriverEarningsPage";
import { DriverNotificationsPage } from "@/pages/driver/DriverNotificationsPage";
import { DriverPoolNavigatePage } from "@/pages/driver/DriverPoolNavigatePage";
import { DriverPoolPage } from "@/pages/driver/DriverPoolPage";
import { DriverProfilePage } from "@/pages/driver/DriverProfilePage";
import { DriverTripsPage } from "@/pages/driver/DriverTripsPage";
import { HomePage } from "@/pages/HomePage";
import { LoadingPage } from "@/pages/LoadingPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { PassengerDashboardPage } from "@/pages/PassengerDashboardPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { SignupPage } from "@/pages/SignupPage";
import { TripDetailPage } from "@/pages/TripDetailPage";
import { ROUTES } from "@/routes/constants";

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    hydrateFallbackElement: <LoadingPage />,
    children: [
      { path: ROUTES.home, element: <HomePage /> },
      { path: ROUTES.login, element: <LoginPage /> },
      { path: ROUTES.signup, element: <SignupPage /> },
    ],
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: ROUTES.passengerDashboard, element: <PassengerDashboardPage /> },
          { path: ROUTES.driverDashboard, element: <DriverDashboardPage /> },
          { path: "/dashboard/driver/trips", element: <DriverTripsPage /> },
          { path: "/dashboard/driver/earnings", element: <DriverEarningsPage /> },
          { path: "/dashboard/driver/pool", element: <DriverPoolPage /> },
          { path: "/dashboard/driver/pool/:groupId", element: <DriverPoolNavigatePage /> },
          { path: "/dashboard/driver/notifications", element: <DriverNotificationsPage /> },
          { path: "/dashboard/driver/profile", element: <DriverProfilePage /> },
          { path: ROUTES.tripDetail, element: <TripDetailPage /> },
          { path: ROUTES.notifications, element: <NotificationsPage /> },
          { path: ROUTES.profile, element: <ProfilePage /> },
          { path: "/dashboard", element: <Navigate to={ROUTES.passengerDashboard} replace /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
