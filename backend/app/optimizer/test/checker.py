from __future__ import annotations

import random
import sys
from math import ceil, isclose
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[3]))

from app.optimizer.core import (
    Driver,
    OptimizationResult,
    PassengerPool,
    PoolOptimizationResult,
    RideRequest,
    assign_drivers_to_pools,
    euclidean_distance,
    optimize_passenger_pools,
    pools_from_pool_plans,
)
from app.optimizer.test.brute_force import (
    brute_force_assign_drivers_to_pools,
    brute_force_optimize_passenger_pools,
)

DEFAULT_CASES = 100
DEFAULT_N = 5
DEFAULT_SEED = 20260627
DEFAULT_LOG_PATH = Path(__file__).resolve().parent / "checker.log"


def main() -> None:
    cases = _generate_cases(DEFAULT_CASES, DEFAULT_N, DEFAULT_SEED)
    errors: list[str] = []
    logs: list[str] = []

    for case_index, (requests, drivers) in enumerate(cases, start=1):
        case_name = f"case_{case_index:03d}"
        pool_count = min(len(drivers), len(requests))
        max_pool_size = ceil(len(requests) / pool_count)

        pooling_expected = brute_force_optimize_passenger_pools(
            requests,
            pool_count=pool_count,
            max_pool_size=max_pool_size,
        )
        pooling_predicted = optimize_passenger_pools(
            requests,
            pool_count=pool_count,
            max_pool_size=max_pool_size,
        )
        expected_pools = pools_from_pool_plans(pooling_expected.pools)
        predicted_pools = pools_from_pool_plans(pooling_predicted.pools)
        hungarian_expected = brute_force_assign_drivers_to_pools(expected_pools, drivers)
        hungarian_predicted = assign_drivers_to_pools(expected_pools, drivers)
        pipeline_expected = brute_force_assign_drivers_to_pools(predicted_pools, drivers)
        pipeline_predicted = assign_drivers_to_pools(predicted_pools, drivers)
        pooling_sanity_errors = _sanity_check_passenger_pooling(
            case_name,
            requests,
            pooling_predicted,
            pool_count,
            max_pool_size,
        )
        hungarian_sanity_errors = _sanity_check_hungarian_assignment(
            case_name,
            expected_pools,
            drivers,
            hungarian_predicted,
        )
        pipeline_sanity_errors = _sanity_check_hungarian_assignment(
            case_name,
            predicted_pools,
            drivers,
            pipeline_predicted,
        )
        pooling_sanity_status = "OK" if not pooling_sanity_errors else "FAILED"
        hungarian_sanity_status = "OK" if not hungarian_sanity_errors else "FAILED"
        pipeline_sanity_status = "OK" if not pipeline_sanity_errors else "FAILED"

        logs.append(
            "\n".join(
                (
                    f"CASE {case_name}",
                    f"POOLING_CONFIG pool_count={pool_count} max_pool_size={max_pool_size}",
                    f"PASSENGER_POOLING expected={pooling_expected.total_cost:.12f} "
                    f"predicted={pooling_predicted.total_cost:.12f}",
                    f"HUNGARIAN_ASSIGNMENT_ON_EXPECTED_POOLS "
                    f"expected={hungarian_expected.total_cost:.12f} "
                    f"predicted={hungarian_predicted.total_cost:.12f}",
                    f"HUNGARIAN_ASSIGNMENT_ON_PREDICTED_POOLS "
                    f"expected={pipeline_expected.total_cost:.12f} "
                    f"predicted={pipeline_predicted.total_cost:.12f}",
                    f"SANITY_CHECK passenger_pooling={pooling_sanity_status} "
                    f"hungarian_assignment={hungarian_sanity_status} "
                    f"pipeline_assignment={pipeline_sanity_status}",
                )
            )
        )

        if not isclose(pooling_expected.total_cost, pooling_predicted.total_cost, abs_tol=1e-8):
            errors.append(f"{case_name}: passenger pooling cost mismatch")
        if not isclose(hungarian_expected.total_cost, hungarian_predicted.total_cost, abs_tol=1e-8):
            errors.append(f"{case_name}: Hungarian assignment cost mismatch")
        if not isclose(pipeline_expected.total_cost, pipeline_predicted.total_cost, abs_tol=1e-8):
            errors.append(f"{case_name}: predicted-pool Hungarian assignment cost mismatch")
        errors.extend(pooling_sanity_errors)
        errors.extend(hungarian_sanity_errors)
        errors.extend(pipeline_sanity_errors)

    DEFAULT_LOG_PATH.write_text("\n\n".join(logs) + "\n", encoding="utf-8")

    if errors:
        for error in errors:
            print(error)
        raise SystemExit(1)

    print(f"PASSED passenger pooling optimizer: {len(cases)} cases")
    print(f"PASSED Hungarian pool assignment: {len(cases)} cases")
    print(f"Log: {DEFAULT_LOG_PATH}")


def _generate_cases(
    case_count: int,
    request_count: int,
    seed: int,
) -> list[tuple[tuple[RideRequest, ...], tuple[Driver, ...]]]:
    rng = random.Random(seed)
    cases = []
    for _ in range(case_count):
        driver_count = rng.randint(2, 4)
        requests = tuple(
            RideRequest(
                id=f"u{i + 1}",
                source=_point(rng),
                destination=_point(rng),
            )
            for i in range(request_count)
        )
        pool_count = min(driver_count, request_count)
        minimum_capacity = ceil(request_count / pool_count)
        drivers = tuple(
            Driver(
                id=f"d{i + 1}",
                current_location=_point(rng),
                capacity=rng.randint(minimum_capacity, request_count),
            )
            for i in range(driver_count)
        )
        cases.append((requests, drivers))
    return cases


def _point(rng: random.Random) -> tuple[float, float]:
    return (round(rng.uniform(-20, 20), 3), round(rng.uniform(-20, 20), 3))


def _sanity_check_passenger_pooling(
    case_name: str,
    requests: tuple[RideRequest, ...],
    result: PoolOptimizationResult,
    pool_count: int,
    max_pool_size: int,
) -> list[str]:
    errors: list[str] = []
    request_by_id = {request.id: request for request in requests}
    expected_ids = set(request_by_id)
    target_pool_count = min(pool_count, len(requests))

    if len(result.pools) != target_pool_count:
        errors.append(
            f"{case_name}: passenger pooling returned {len(result.pools)} pools, "
            f"expected {target_pool_count}"
        )

    seen_ids: list[str] = []
    cost_sum = 0.0

    for pool in result.pools:
        pool_ids = tuple(passenger.user_id for passenger in pool.passengers)
        seen_ids.extend(pool_ids)
        cost_sum += pool.cost

        if not pool.passengers:
            errors.append(f"{case_name}: passenger pooling produced empty pool {pool.pool_id}")
        if len(pool.passengers) > max_pool_size:
            errors.append(f"{case_name}: pool {pool.pool_id} exceeds max_pool_size")
        if pool.user_ids != pool_ids:
            errors.append(f"{case_name}: pool {pool.pool_id} user_ids do not match passengers")
        if set(pool.dropoff_order) != set(pool_ids):
            errors.append(
                f"{case_name}: pool {pool.pool_id} dropoff_order does not cover pool users"
            )

        expected_centroid = _centroid(
            tuple(request_by_id[user_id].source for user_id in pool_ids)
        )
        if not _same_point(pool.centroid, expected_centroid):
            errors.append(f"{case_name}: pool {pool.pool_id} centroid mismatch")
        if not pool.track or not _same_point(pool.track[0], pool.centroid):
            errors.append(f"{case_name}: pool {pool.pool_id} track does not start at centroid")

        expected_track_tail = tuple(
            request_by_id[user_id].destination for user_id in pool.dropoff_order
        )
        if tuple(pool.track[1:]) != expected_track_tail:
            errors.append(
                f"{case_name}: pool {pool.pool_id} track tail does not match dropoff_order"
            )
        if not isclose(_path_cost(pool.track), pool.cost, abs_tol=1e-8):
            errors.append(f"{case_name}: pool {pool.pool_id} cost does not match track distance")

    if set(seen_ids) != expected_ids or len(seen_ids) != len(expected_ids):
        errors.append(f"{case_name}: passenger pooling does not cover each request exactly once")
    if not isclose(cost_sum, result.total_cost, abs_tol=1e-8):
        errors.append(f"{case_name}: passenger pooling total_cost does not equal sum(pool.cost)")

    return errors


def _sanity_check_hungarian_assignment(
    case_name: str,
    pools: tuple[PassengerPool, ...],
    drivers: tuple[Driver, ...],
    result: OptimizationResult,
) -> list[str]:
    errors: list[str] = []
    pool_by_id = {pool.id: pool for pool in pools}
    driver_by_id = {driver.id: driver for driver in drivers}
    expected_pool_ids = set(pool_by_id)
    seen_pool_ids: list[str] = []
    seen_driver_ids: list[str] = []
    seen_user_ids: list[str] = []
    cost_sum = 0.0

    if len(result.groups) != len(pools):
        errors.append(
            f"{case_name}: Hungarian assignment returned {len(result.groups)} groups, "
            f"expected {len(pools)}"
        )

    for group in result.groups:
        cost_sum += group.cost
        if group.pool_id is None or group.pool_id not in pool_by_id:
            errors.append(f"{case_name}: Hungarian assignment returned unknown pool_id")
            continue
        if group.driver_id not in driver_by_id:
            errors.append(f"{case_name}: Hungarian assignment returned unknown driver_id")
            continue

        pool = pool_by_id[group.pool_id]
        driver = driver_by_id[group.driver_id]
        group_user_ids = tuple(passenger.user_id for passenger in group.passengers)
        pool_user_ids = tuple(request.id for request in pool.requests)
        pool_request_by_id = {request.id: request for request in pool.requests}

        seen_pool_ids.append(group.pool_id)
        seen_driver_ids.append(group.driver_id)
        seen_user_ids.extend(group_user_ids)

        if set(group_user_ids) != set(pool_user_ids) or len(group_user_ids) != len(pool_user_ids):
            errors.append(f"{case_name}: group {group.pool_id} passengers do not match pool")
        if len(group.passengers) > driver.capacity:
            errors.append(f"{case_name}: group {group.pool_id} exceeds driver capacity")
        if group.user_ids != group_user_ids:
            errors.append(f"{case_name}: group {group.pool_id} user_ids do not match passengers")
        if set(group.dropoff_order) != set(group_user_ids):
            errors.append(
                f"{case_name}: group {group.pool_id} dropoff_order does not cover users"
            )
        if not group.track or not _same_point(group.track[0], driver.current_location):
            errors.append(f"{case_name}: group {group.pool_id} track does not start at driver")

        expected_track_tail = tuple(
            pool_request_by_id[user_id].destination for user_id in group.dropoff_order
        )
        if tuple(group.track[1:]) != expected_track_tail:
            errors.append(
                f"{case_name}: group {group.pool_id} track tail does not match dropoff_order"
            )
        if not isclose(_path_cost(group.track), group.cost, abs_tol=1e-8):
            errors.append(f"{case_name}: group {group.pool_id} cost does not match track distance")

    if set(seen_pool_ids) != expected_pool_ids or len(seen_pool_ids) != len(expected_pool_ids):
        errors.append(f"{case_name}: Hungarian assignment does not cover each pool exactly once")
    if len(seen_driver_ids) != len(set(seen_driver_ids)):
        errors.append(f"{case_name}: Hungarian assignment reused a driver")
    if len(seen_user_ids) != len(set(seen_user_ids)):
        errors.append(f"{case_name}: Hungarian assignment duplicated a passenger")
    if not isclose(cost_sum, result.total_cost, abs_tol=1e-8):
        errors.append(f"{case_name}: Hungarian total_cost does not equal sum(group.cost)")

    return errors


def _centroid(points: tuple[tuple[float, float], ...]) -> tuple[float, float]:
    return (
        sum(point[0] for point in points) / len(points),
        sum(point[1] for point in points) / len(points),
    )


def _path_cost(track: tuple[tuple[float, float], ...]) -> float:
    return sum(
        euclidean_distance(track[index - 1], track[index])
        for index in range(1, len(track))
    )


def _same_point(a: tuple[float, float], b: tuple[float, float]) -> bool:
    return isclose(a[0], b[0], abs_tol=1e-8) and isclose(a[1], b[1], abs_tol=1e-8)


if __name__ == "__main__":
    main()
