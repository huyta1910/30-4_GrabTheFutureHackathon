from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Query

from app.dependencies.driver import EarningsServiceDep
from app.schemas.common import ApiResponse
from app.schemas.driver.earnings import EarningsSummary

router = APIRouter()


@router.get("/{driver_id}/earnings", response_model=ApiResponse[EarningsSummary])
async def get_earnings(
    driver_id: UUID,
    period: Literal["week", "month"] = Query(default="week"),
    service: EarningsServiceDep = ...,
) -> ApiResponse[EarningsSummary]:
    data = service.get_summary(driver_id, period)
    return ApiResponse(data=data, message="Earnings summary")
