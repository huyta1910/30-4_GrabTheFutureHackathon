from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status

from app.models.driver import Driver
from app.repositories.driver.driver_repository import DriverRepository
from app.repositories.driver.trip_repository import DriverTripRepository
from app.schemas.driver.dashboard import DriverDashboard, DriverDashboardStats
from app.schemas.driver.driver import AvailabilityUpdate, DriverRead
from app.schemas.driver.trip import DriverTripRead


class DriverService:
    """Business logic for driver-facing features."""

    def __init__(
        self,
        driver_repository: DriverRepository,
        trip_repository: DriverTripRepository,
    ) -> None:
        self._drivers = driver_repository
        self._trips = trip_repository

    def get_dashboard(self, driver_id: UUID) -> DriverDashboard:
        driver = self._get_driver_or_404(driver_id)
        active_trip = self._trips.get_active_trip(driver_id)

        stats = DriverDashboardStats(
            total_trips=self._trips.count_by_driver(driver_id),
            completed_trips=self._trips.count_completed(driver_id),
            earnings_today=self._trips.total_earnings(driver_id, since=_start_of_today()),
            earnings_total=self._trips.total_earnings(driver_id),
        )

        return DriverDashboard(
            driver=DriverRead.model_validate(driver),
            stats=stats,
            active_trip=(
                DriverTripRead.model_validate(active_trip) if active_trip else None
            ),
        )

    def update_availability(self, driver_id: UUID, payload: AvailabilityUpdate) -> DriverRead:
        driver = self._get_driver_or_404(driver_id)
        updated = self._drivers.update_availability(
            driver,
            payload.availability_status.value,
        )
        return DriverRead.model_validate(updated)

    def _get_driver_or_404(self, driver_id: UUID) -> Driver:
        driver = self._drivers.get(driver_id)
        if driver is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found",
            )
        return driver


def _start_of_today() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)
