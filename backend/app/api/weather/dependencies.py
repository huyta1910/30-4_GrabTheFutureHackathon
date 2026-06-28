from typing import Annotated

from fastapi import Depends

from app.dependencies.database import DatabaseSession
from app.repositories.weather import WeatherRepository
from app.services.weather import WeatherService


def get_weather_repository(session: DatabaseSession) -> WeatherRepository:
    return WeatherRepository(session)


WeatherRepositoryDependency = Annotated[
    WeatherRepository,
    Depends(get_weather_repository),
]


def get_weather_service(repository: WeatherRepositoryDependency) -> WeatherService:
    return WeatherService(repository)


WeatherServiceDependency = Annotated[
    WeatherService,
    Depends(get_weather_service),
]
