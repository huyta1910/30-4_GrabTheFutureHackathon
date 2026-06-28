from uuid import UUID

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class WeatherAlertNotification(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "weather_alert_notifications"
    __table_args__ = (
        UniqueConstraint(
            "weather_alert_id",
            "user_id",
            name="uq_weather_alert_notifications_alert_user",
        ),
    )

    weather_alert_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("weather_alerts.id"),
        nullable=False,
    )
    notification_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("notifications.id"),
        nullable=False,
    )
    user_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
