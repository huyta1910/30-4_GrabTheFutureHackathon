from uuid import UUID

from app.models.notification import Notification
from app.repositories.weather_alert import (
    DEFAULT_WEATHER_ALERT_CITY,
    WeatherAlertRepository,
)


class WeatherAlertService:
    def __init__(self, repository: WeatherAlertRepository) -> None:
        self.repository = repository

    def ensure_notification_for_user(
        self,
        user_id: UUID,
        city: str = DEFAULT_WEATHER_ALERT_CITY,
    ) -> Notification | None:
        active_alert = self.repository.get_active_city_alert(city=city)
        if active_alert is None:
            return None
        if self.repository.has_notification_for_alert(active_alert.id, user_id):
            return None
        return self.repository.create_notification_for_alert(active_alert, user_id)
