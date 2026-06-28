from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    project_name: str = "Adaptive AI Ride Pooling"
    api_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"
    environment: str = "local"
    database_url: str = Field(
        default=(
            "postgresql+psycopg://adaptive_user:adaptive_password"
            "@localhost:5432/adaptive_ride_pooling"
        ),
        validation_alias="DATABASE_URL",
    )
    backend_cors_origins: str = Field(
        default="http://localhost:5173",
        validation_alias="BACKEND_CORS_ORIGINS",
    )

    # Real road routing (VietMap Route API). When no key is set the driver
    # services fall back to the straight-line mock polyline.
    routing_enabled: bool = Field(default=True, validation_alias="ROUTING_ENABLED")
    vietmap_api_key: str = Field(default="", validation_alias="VIETMAP_API_KEY")
    vietmap_route_url: str = Field(
        default="https://maps.vietmap.vn/api/route",
        validation_alias="VIETMAP_ROUTE_URL",
    )
    routing_timeout_seconds: float = Field(
        default=4.0,
        validation_alias="ROUTING_TIMEOUT_SECONDS",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
