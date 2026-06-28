from decimal import Decimal
from uuid import UUID

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Driver(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "drivers"

    user_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    license_number: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    vehicle_label: Mapped[str] = mapped_column(String(120), nullable=False)
    availability_status: Mapped[str] = mapped_column(String(50), nullable=False, default="inactive")
    # Current driver location (used by the AI router as the route start point).
    current_latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    current_longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
