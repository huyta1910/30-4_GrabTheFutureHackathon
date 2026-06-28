from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.passenger import Passenger
from app.models.weather_event import WeatherEvent


class WeatherRepository:
    """Data access for weather forecasts + per-passenger alerts."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create_event(
        self,
        event_type: str,
        severity: str,
        location_label: str,
        observed_at: datetime,
    ) -> WeatherEvent:
        event = WeatherEvent(
            event_type=event_type,
            severity=severity,
            location_label=location_label,
            observed_at=observed_at,
        )
        self.session.add(event)
        self.session.flush()
        return event

    def list_passenger_user_ids(self) -> list[UUID]:
        return list(self.session.scalars(select(Passenger.user_id)).all())

    def add_alert_notification(self, user_id: UUID, title: str, body: str) -> None:
        self.session.add(
            Notification(
                user_id=user_id,
                title=title,
                body=body,
                status="unread",
                category="weather_alert",
            )
        )

    def commit(self) -> None:
        self.session.commit()
