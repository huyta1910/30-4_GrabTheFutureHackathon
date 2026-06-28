from typing import Annotated

from fastapi import Depends

from app.dependencies.database import DatabaseSession
from app.repositories.passenger import PassengerRepository
from app.repositories.weather_alert import WeatherAlertRepository
from app.services.passenger import PassengerService
from app.services.weather_alert import WeatherAlertService


def get_passenger_repository(session: DatabaseSession) -> PassengerRepository:
    return PassengerRepository(session)


PassengerRepositoryDependency = Annotated[
    PassengerRepository,
    Depends(get_passenger_repository),
]


def get_weather_alert_repository(session: DatabaseSession) -> WeatherAlertRepository:
    return WeatherAlertRepository(session)


WeatherAlertRepositoryDependency = Annotated[
    WeatherAlertRepository,
    Depends(get_weather_alert_repository),
]


def get_weather_alert_service(
    repository: WeatherAlertRepositoryDependency,
) -> WeatherAlertService:
    return WeatherAlertService(repository)


WeatherAlertServiceDependency = Annotated[
    WeatherAlertService,
    Depends(get_weather_alert_service),
]


def get_passenger_service(
    repository: PassengerRepositoryDependency,
    weather_alert_service: WeatherAlertServiceDependency,
) -> PassengerService:
    return PassengerService(repository, weather_alert_service)


PassengerServiceDependency = Annotated[
    PassengerService,
    Depends(get_passenger_service),
]
