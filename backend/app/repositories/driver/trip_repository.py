from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import cast, func, select
from sqlalchemy import Date as DateType
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.trip_history import TripHistory

ACTIVE_TRIP_STATUSES = ("assigned", "en_route", "in_progress")
COMPLETED_TRIP_STATUS = "completed"


class DriverTripRepository:
    """Data access for trips associated with a driver."""

    def __init__(self, session: Session) -> None:
        self.session = session

    # --- Dashboard aggregates ---

    def count_by_driver(self, driver_id: UUID) -> int:
        statement = (
            select(func.count())
            .select_from(TripHistory)
            .where(TripHistory.driver_id == driver_id)
        )
        return self.session.scalar(statement) or 0

    def count_completed(self, driver_id: UUID) -> int:
        statement = (
            select(func.count())
            .select_from(TripHistory)
            .where(
                TripHistory.driver_id == driver_id,
                TripHistory.status == COMPLETED_TRIP_STATUS,
            )
        )
        return self.session.scalar(statement) or 0

    def total_earnings(self, driver_id: UUID, since: datetime | None = None) -> Decimal:
        statement = select(func.coalesce(func.sum(TripHistory.total_fare), 0)).where(
            TripHistory.driver_id == driver_id,
            TripHistory.status == COMPLETED_TRIP_STATUS,
        )
        if since is not None:
            statement = statement.where(TripHistory.completed_at >= since)
        return Decimal(self.session.scalar(statement) or 0)

    def get_active_trip(self, driver_id: UUID) -> TripHistory | None:
        statement = (
            select(TripHistory)
            .where(
                TripHistory.driver_id == driver_id,
                TripHistory.status.in_(ACTIVE_TRIP_STATUSES),
            )
            .order_by(TripHistory.created_at.desc())
        )
        return self.session.scalars(statement).first()

    # --- Trip management ---

    def list_trips(
        self,
        driver_id: UUID,
        statuses: tuple[str, ...] | None,
        limit: int,
        offset: int,
    ) -> list[tuple[TripHistory, Booking | None]]:
        statement = (
            select(TripHistory, Booking)
            .join(Booking, Booking.id == TripHistory.booking_id, isouter=True)
            .where(TripHistory.driver_id == driver_id)
            .order_by(TripHistory.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if statuses:
            statement = statement.where(TripHistory.status.in_(statuses))
        rows = self.session.execute(statement).all()
        return [(row[0], row[1]) for row in rows]

    def count_trips(self, driver_id: UUID, statuses: tuple[str, ...] | None) -> int:
        statement = (
            select(func.count())
            .select_from(TripHistory)
            .where(TripHistory.driver_id == driver_id)
        )
        if statuses:
            statement = statement.where(TripHistory.status.in_(statuses))
        return self.session.scalar(statement) or 0

    def get_trip(self, driver_id: UUID, trip_id: UUID) -> TripHistory | None:
        statement = select(TripHistory).where(
            TripHistory.id == trip_id,
            TripHistory.driver_id == driver_id,
        )
        return self.session.scalars(statement).first()

    def get_trip_with_booking(
        self,
        driver_id: UUID,
        trip_id: UUID,
    ) -> tuple[TripHistory, Booking | None] | None:
        statement = (
            select(TripHistory, Booking)
            .join(Booking, Booking.id == TripHistory.booking_id, isouter=True)
            .where(
                TripHistory.id == trip_id,
                TripHistory.driver_id == driver_id,
            )
        )
        row = self.session.execute(statement).first()
        if row is None:
            return None
        return row[0], row[1]

    def save(self, trip: TripHistory, booking: Booking | None = None) -> TripHistory:
        self.session.add(trip)
        if booking is not None:
            self.session.add(booking)
        self.session.commit()
        self.session.refresh(trip)
        return trip

    # --- Earnings ---

    def earnings_by_day(
        self,
        driver_id: UUID,
        since: datetime,
        until: datetime,
    ) -> list[tuple]:
        stmt = (
            select(
                cast(TripHistory.completed_at, DateType).label("day"),
                func.coalesce(func.sum(TripHistory.total_fare), 0).label("amount"),
                func.count().label("trips"),
            )
            .where(
                TripHistory.driver_id == driver_id,
                TripHistory.status == COMPLETED_TRIP_STATUS,
                TripHistory.completed_at >= since,
                TripHistory.completed_at <= until,
            )
            .group_by("day")
            .order_by("day")
        )
        return list(self.session.execute(stmt).all())
