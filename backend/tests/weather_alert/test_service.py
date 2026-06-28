from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.models.notification import Notification
from app.models.weather_alert import WeatherAlert
from app.repositories.weather_alert import WeatherAlertRepository
from app.services.weather_alert import WeatherAlertService


class FakeWeatherAlertRepository(WeatherAlertRepository):
    def __init__(self, active_alert: WeatherAlert | None) -> None:
        self.active_alert = active_alert
        self.sent_pairs: set[tuple[UUID, UUID]] = set()
        self.created_notifications: list[Notification] = []

    def get_active_city_alert(
        self,
        city: str = "Ho Chi Minh City",
        now: datetime | None = None,
    ) -> WeatherAlert | None:
        return self.active_alert

    def has_notification_for_alert(self, weather_alert_id: UUID, user_id: UUID) -> bool:
        return (weather_alert_id, user_id) in self.sent_pairs

    def create_notification_for_alert(
        self,
        weather_alert: WeatherAlert,
        user_id: UUID,
    ) -> Notification:
        notification = Notification(
            id=uuid4(),
            user_id=user_id,
            title=weather_alert.title,
            body=weather_alert.message,
            status="unread",
        )
        self.sent_pairs.add((weather_alert.id, user_id))
        self.created_notifications.append(notification)
        return notification


def test_no_active_weather_alert_does_not_create_notification() -> None:
    repository = FakeWeatherAlertRepository(active_alert=None)
    service = WeatherAlertService(repository)

    notification = service.ensure_notification_for_user(uuid4())

    assert notification is None
    assert repository.created_notifications == []


def test_active_weather_alert_creates_one_notification_per_user() -> None:
    user_id = uuid4()
    alert = _weather_alert()
    repository = FakeWeatherAlertRepository(active_alert=alert)
    service = WeatherAlertService(repository)

    first_notification = service.ensure_notification_for_user(user_id)
    second_notification = service.ensure_notification_for_user(user_id)

    assert first_notification is not None
    assert first_notification.title == alert.title
    assert second_notification is None
    assert len(repository.created_notifications) == 1


def _weather_alert() -> WeatherAlert:
    now = datetime.now(UTC)
    return WeatherAlert(
        id=uuid4(),
        city="Ho Chi Minh City",
        event_type="rain",
        severity="heavy",
        title="Heavy rain expected in Ho Chi Minh City",
        message="Heavy rain may affect rides in Ho Chi Minh City within the next hour.",
        starts_at=now - timedelta(minutes=10),
        ends_at=now + timedelta(hours=1),
        source="mock",
        is_active=True,
    )
