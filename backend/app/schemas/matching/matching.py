from pydantic import BaseModel


class MatchingSummary(BaseModel):
    pools_created: int
    bookings_matched: int
    total_cost: float
