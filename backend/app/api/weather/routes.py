from fastapi import APIRouter

from app.api.weather.dependencies import WeatherServiceDependency
from app.schemas.common import ApiResponse
from app.schemas.weather import WeatherAlertCreate, WeatherAlertResult

router = APIRouter(prefix="/weather", tags=["weather"])


@router.post("/alerts", response_model=ApiResponse[WeatherAlertResult])
async def raise_weather_alert(
    payload: WeatherAlertCreate,
    service: WeatherServiceDependency,
) -> ApiResponse[WeatherAlertResult]:
    """Simulate a heavy-rain forecast and warn affected passengers ahead of time."""
    result = service.raise_alert(payload)
    return ApiResponse(message="Weather alert sent.", data=result)
