from uuid import UUID

from fastapi import APIRouter

from app.dependencies.driver import PoolServiceDep
from app.schemas.common import ApiResponse
from app.schemas.driver.pool import PoolRespondPayload, PoolSuggestion

router = APIRouter()


@router.get("/{driver_id}/pool-suggestions", response_model=ApiResponse[list[PoolSuggestion]])
async def list_pool_suggestions(
    driver_id: UUID,
    service: PoolServiceDep,
) -> ApiResponse[list[PoolSuggestion]]:
    data = service.list_suggestions(driver_id)
    return ApiResponse(data=data, message="Pool suggestions")


@router.get(
    "/{driver_id}/pool-suggestions/{group_id}",
    response_model=ApiResponse[PoolSuggestion],
)
async def get_pool_suggestion(
    driver_id: UUID,
    group_id: UUID,
    service: PoolServiceDep,
) -> ApiResponse[PoolSuggestion]:
    data = service.get_suggestion(group_id, driver_id)
    return ApiResponse(data=data, message="Pool suggestion")


@router.patch(
    "/{driver_id}/pool-suggestions/{group_id}/respond",
    response_model=ApiResponse[PoolSuggestion],
)
async def respond_to_pool(
    driver_id: UUID,
    group_id: UUID,
    payload: PoolRespondPayload,
    service: PoolServiceDep,
) -> ApiResponse[PoolSuggestion]:
    data = service.respond(driver_id, group_id, payload)
    return ApiResponse(data=data, message=f"Pool {payload.action}ed")


@router.post(
    "/{driver_id}/pool-suggestions/{group_id}/complete",
    response_model=ApiResponse[PoolSuggestion],
)
async def complete_pool(
    driver_id: UUID,
    group_id: UUID,
    service: PoolServiceDep,
) -> ApiResponse[PoolSuggestion]:
    data = service.complete(driver_id, group_id)
    return ApiResponse(data=data, message="Pool completed")
