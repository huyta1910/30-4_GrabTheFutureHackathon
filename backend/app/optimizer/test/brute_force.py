from __future__ import annotations

from collections.abc import Sequence
from itertools import permutations

from app.optimizer.core import (
    INF,
    Driver,
    OptimizationResult,
    PassengerPool,
    PoolOptimizationResult,
    RideRequest,
    RoutePlan,
    build_pool_plan,
    build_route_plan,
    euclidean_distance,
)


def brute_force_optimize_passenger_pools(
    requests: Sequence[RideRequest],
    pool_count: int,
    max_pool_size: int,
) -> PoolOptimizationResult:
    target_pool_count = min(pool_count, len(requests))
    user_count = len(requests)
    all_mask = (1 << user_count) - 1
    best_cost = INF
    best_masks: tuple[int, ...] = ()
    best_orders: dict[int, tuple[int, ...]] = {}
    best_centroids: dict[int, tuple[float, float]] = {}
    best_pool_costs: dict[int, float] = {}

    for mask in range(1, 1 << user_count):
        if mask.bit_count() > max_pool_size:
            continue
        indices = _indices_from_mask(mask, user_count)
        centroid = _centroid(tuple(requests[index].source for index in indices))
        cost, order = _brute_force_route_indices(centroid, requests, indices)
        best_orders[mask] = order
        best_centroids[mask] = centroid
        best_pool_costs[mask] = cost

    def search(
        used_pools: int,
        remaining_mask: int,
        chosen_masks: tuple[int, ...],
        current_cost: float,
    ) -> None:
        nonlocal best_cost, best_masks

        if current_cost >= best_cost:
            return
        if used_pools == target_pool_count:
            if remaining_mask == 0:
                best_cost = current_cost
                best_masks = chosen_masks
            return

        submask = remaining_mask
        while submask:
            if submask in best_pool_costs:
                search(
                    used_pools + 1,
                    remaining_mask ^ submask,
                    chosen_masks + (submask,),
                    current_cost + best_pool_costs[submask],
                )
            submask = (submask - 1) & remaining_mask

    search(0, all_mask, (), 0.0)
    if best_cost == INF:
        raise ValueError("No feasible passenger pooling assignment.")

    pools = tuple(
        build_pool_plan(
            pool_id=f"pool-{index}",
            requests=requests,
            member_indices=_indices_from_mask(mask, user_count),
            route_order_indices=best_orders[mask],
            centroid=best_centroids[mask],
            cost=best_pool_costs[mask],
        )
        for index, mask in enumerate(best_masks, start=1)
    )
    return PoolOptimizationResult(pools=pools, total_cost=best_cost)


def brute_force_assign_drivers_to_pools(
    pools: Sequence[PassengerPool],
    drivers: Sequence[Driver],
) -> OptimizationResult:
    best_cost = INF
    best_groups: tuple[RoutePlan, ...] = ()

    for driver_order in permutations(range(len(drivers)), len(pools)):
        current_cost = 0.0
        groups = []
        feasible = True
        for pool_index, driver_index in enumerate(driver_order):
            pool = pools[pool_index]
            driver = drivers[driver_index]
            if len(pool.requests) > driver.capacity:
                feasible = False
                break
            indices = tuple(range(len(pool.requests)))
            cost, order = _brute_force_route_indices(
                driver.current_location,
                pool.requests,
                indices,
            )
            current_cost += cost
            groups.append(
                build_route_plan(
                    driver=driver,
                    requests=pool.requests,
                    member_indices=indices,
                    route_order_indices=order,
                    cost=cost,
                    pool_id=pool.id,
                )
            )
        if feasible and current_cost < best_cost:
            best_cost = current_cost
            best_groups = tuple(groups)

    if best_cost == INF:
        raise ValueError("No feasible driver-to-pool assignment.")
    return OptimizationResult(groups=best_groups, total_cost=best_cost)


def _brute_force_route_indices(
    start: tuple[float, float],
    requests: Sequence[RideRequest],
    request_indices: tuple[int, ...],
) -> tuple[float, tuple[int, ...]]:
    if not request_indices:
        return 0.0, ()

    best_cost = INF
    best_order: tuple[int, ...] = ()
    for order in permutations(request_indices):
        current = start
        cost = 0.0
        for request_index in order:
            cost += euclidean_distance(current, requests[request_index].destination)
            current = requests[request_index].destination
        if cost < best_cost:
            best_cost = cost
            best_order = order
    return best_cost, best_order


def _indices_from_mask(mask: int, item_count: int) -> tuple[int, ...]:
    return tuple(index for index in range(item_count) if mask & (1 << index))


def _centroid(points: Sequence[tuple[float, float]]) -> tuple[float, float]:
    return (
        sum(point[0] for point in points) / len(points),
        sum(point[1] for point in points) / len(points),
    )
