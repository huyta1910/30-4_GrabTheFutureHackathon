from datetime import datetime, timezone

from app.repositories.weather import WeatherRepository
from app.schemas.weather import WeatherAlertCreate, WeatherAlertResult


class WeatherService:
    """Smart weather alerts.

    Simulates a forecast monitor: when heavy rain is expected soon, every
    passenger in the affected area is warned ahead of time so they can book
    before demand spikes. The real system would scope by passenger location;
    for now the alert is broadcast to all passengers.
    """

    def __init__(self, repository: WeatherRepository) -> None:
        self._repo = repository

    def raise_alert(self, payload: WeatherAlertCreate) -> WeatherAlertResult:
        event = self._repo.create_event(
            event_type="heavy_rain",
            severity=payload.severity,
            location_label=payload.location_label,
            observed_at=datetime.now(timezone.utc),
        )

        title = "⛈️ Cảnh báo mưa lớn"
        body = (
            f"Mưa lớn dự kiến sẽ xuất hiện trong khoảng {payload.minutes_until_rain} "
            f"phút nữa tại {payload.location_label}. Bạn nên đặt xe trước ngay bây giờ "
            "để tránh phải chờ lâu."
        )

        user_ids = self._repo.list_passenger_user_ids()
        for user_id in user_ids:
            self._repo.add_alert_notification(user_id, title, body)
        self._repo.commit()

        return WeatherAlertResult(
            event_id=event.id,
            location_label=payload.location_label,
            minutes_until_rain=payload.minutes_until_rain,
            passengers_notified=len(user_ids),
        )
