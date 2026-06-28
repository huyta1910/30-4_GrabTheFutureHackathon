from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.weather_alert import WeatherAlert
from app.models.weather_alert_notification import WeatherAlertNotification

DEFAULT_WEATHER_ALERT_CITY = "Ho Chi Minh City"
WEATHER_ALERT_SEVERITIES = ("moderate", "heavy", "severe")


class WeatherAlertRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_active_city_alert(
        self,
        city: str = DEFAULT_WEATHER_ALERT_CITY,
        now: datetime | None = None,
    ) -> WeatherAlert | None:
        current_time = now or datetime.now(UTC)
        statement = (
            select(WeatherAlert)
            .where(
                WeatherAlert.city == city,
                WeatherAlert.is_active.is_(True),
                WeatherAlert.starts_at <= current_time,
                WeatherAlert.ends_at >= current_time,
                WeatherAlert.severity.in_(WEATHER_ALERT_SEVERITIES),
            )
            .order_by(WeatherAlert.starts_at.desc(), WeatherAlert.created_at.desc())
            .limit(1)
        )
        return self.session.scalars(statement).first()

    def has_notification_for_alert(self, weather_alert_id: UUID, user_id: UUID) -> bool:
        statement = (
            select(WeatherAlertNotification.id)
            .where(
                WeatherAlertNotification.weather_alert_id == weather_alert_id,
                WeatherAlertNotification.user_id == user_id,
            )
            .limit(1)
        )
        return self.session.scalar(statement) is not None

    def create_notification_for_alert(
        self,
        weather_alert: WeatherAlert,
        user_id: UUID,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            title=weather_alert.title,
            body=weather_alert.message,
            status="unread",
        )
        self.session.add(notification)
        self.session.flush()

        self.session.add(
            WeatherAlertNotification(
                weather_alert_id=weather_alert.id,
                notification_id=notification.id,
                user_id=user_id,
            )
        )
        self.session.commit()
        self.session.refresh(notification)
        return notification
