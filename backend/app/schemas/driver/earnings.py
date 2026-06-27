from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class DailyEarning(BaseModel):
    date: date
    amount: Decimal
    trip_count: int


class EarningsSummary(BaseModel):
    period: str
    total: Decimal
    trip_count: int
    average_per_trip: Decimal
    daily: list[DailyEarning]
