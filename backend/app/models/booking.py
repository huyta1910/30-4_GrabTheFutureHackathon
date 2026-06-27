from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Booking(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bookings"

    passenger_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("passengers.id"),
        nullable=False,
    )
    pickup_label: Mapped[str] = mapped_column(String(255), nullable=False)
    dropoff_label: Mapped[str] = mapped_column(String(255), nullable=False)
    pickup_latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    pickup_longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    dropoff_latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    dropoff_longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    estimated_fare: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
