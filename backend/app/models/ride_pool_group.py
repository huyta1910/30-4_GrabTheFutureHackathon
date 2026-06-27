from uuid import UUID

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class RidePoolGroup(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ride_pool_groups"

    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")
    origin_area: Mapped[str | None] = mapped_column(String(255), nullable=True)
    destination_area: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Set when a driver accepts the pool; links the group to the driver who serves it.
    driver_id: Mapped[UUID | None] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("drivers.id"),
        nullable=True,
    )
