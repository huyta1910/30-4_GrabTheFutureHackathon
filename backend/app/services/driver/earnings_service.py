from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status

from app.repositories.driver.driver_repository import DriverRepository
from app.repositories.driver.trip_repository import DriverTripRepository
from app.schemas.driver.earnings import DailyEarning, EarningsSummary


class EarningsService:
    def __init__(
        self,
        driver_repo: DriverRepository,
        trip_repo: DriverTripRepository,
    ) -> None:
        self._drivers = driver_repo
        self._trips = trip_repo

    def get_summary(self, driver_id: UUID, period: str) -> EarningsSummary:
        driver = self._drivers.get(driver_id)
        if driver is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")

        now = datetime.now(timezone.utc)
        days = 7 if period == "week" else 30
        since = now - timedelta(days=days)

        rows = self._trips.earnings_by_day(driver_id, since, now)
        daily = [DailyEarning(date=r[0], amount=Decimal(str(r[1])), trip_count=r[2]) for r in rows]
        total = sum(d.amount for d in daily) if daily else Decimal(0)
        trip_count = sum(d.trip_count for d in daily)
        avg = (total / trip_count) if trip_count > 0 else Decimal(0)

        return EarningsSummary(
            period=period,
            total=total,
            trip_count=trip_count,
            average_per_trip=avg,
            daily=daily,
        )
