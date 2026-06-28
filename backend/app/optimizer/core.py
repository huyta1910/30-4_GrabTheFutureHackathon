from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from math import isfinite, sqrt

Point = tuple[float, float]
EPSILON = 1e-9
INF = float("inf")


@dataclass(frozen=True)
class RideRequest:
    """A passenger request with 2D source/destination coordinates."""

    id: str
    source: Point
    destination: Point


@dataclass(frozen=True)
class Driver:
    """A driver's current location after the pickup phase has finished."""

    id: str
    current_location: Point
    capacity: int


@dataclass(frozen=True)
class PassengerAssignment:
    """Passenger coordinates kept in the final optimizer output."""

    user_id: str
    source: Point
    destination: Point


@dataclass(frozen=True)
class PassengerPool:
    """A passenger pool produced before driver assignment."""

    id: str
    requests: tuple[RideRequest, ...]


@dataclass(frozen=True)
class PoolPlan:
    """A driver-independent passenger pool optimized from its centroid."""

    pool_id: str
    passengers: tuple[PassengerAssignment, ...]
    centroid: Point
    track: tuple[Point, ...]
    user_ids: tuple[str, ...]
    dropoff_order: tuple[str, ...]
    cost: float


@dataclass(frozen=True)
class PoolOptimizationResult:
    pools: tuple[PoolPlan, ...]
    total_cost: float


@dataclass(frozen=True)
class RoutePlan:
    """Optimized drop-off route for one driver."""

    driver_id: str
    passengers: tuple[PassengerAssignment, ...]
    track: tuple[Point, ...]
    user_ids: tuple[str, ...]
    dropoff_order: tuple[str, ...]
    cost: float
    pool_id: str | None = None


@dataclass(frozen=True)
class OptimizationResult:
    groups: tuple[RoutePlan, ...]
    total_cost: float


def euclidean_distance(a: Point, b: Point) -> float:
    """Compute distance by treating (lng, lat) as a 2D point."""

    return sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)


def held_karp_path(start: Point, requests: Sequence[RideRequest]) -> tuple[float, tuple[str, ...]]:
    """
    Solve the TSP path variant for one already-picked-up group.

    The route starts at ``start`` and visits every request destination exactly
    once. There is no return-to-depot edge.
    """

    _validate_point("start", start)
    for request in requests:
        _validate_request(request)

    cost, order_indices = _held_karp_indices(start, requests, tuple(range(len(requests))))
    return cost, tuple(requests[index].id for index in order_indices)


def optimize_groups(
    requests: Sequence[RideRequest],
    drivers: Sequence[Driver],
) -> OptimizationResult:
    """
    Assign all requests to drivers and minimize ``sum(z_i)`` exactly.

    For every possible group assigned to a driver, ``z_i`` is computed with
    Held-Karp over that group's destinations. The outer assignment DP then
    chooses one subset for each driver so every request is assigned once.
    """

    _validate_problem(requests, drivers)

    user_count = len(requests)
    driver_count = len(drivers)
    all_users_mask = (1 << user_count) - 1
    mask_count = 1 << user_count

    route_costs: list[list[float]] = [[INF] * mask_count for _ in drivers]
    route_orders: list[list[tuple[int, ...]]] = [[()] * mask_count for _ in drivers]

    for driver_index, driver in enumerate(drivers):
        for user_mask in range(mask_count):
            if user_mask.bit_count() > driver.capacity:
                continue

            indices = _indices_from_mask(user_mask, user_count)
            cost, order = _held_karp_indices(driver.current_location, requests, indices)
            route_costs[driver_index][user_mask] = cost
            route_orders[driver_index][user_mask] = order

    dp: list[list[float]] = [[INF] * mask_count for _ in range(driver_count + 1)]
    parent: list[list[int]] = [[-1] * mask_count for _ in range(driver_count + 1)]
    dp[0][0] = 0.0
    parent[0][0] = 0

    for used_drivers in range(1, driver_count + 1):
        driver_index = used_drivers - 1

        for user_mask in range(mask_count):
            submask = user_mask

            while True:
                previous_mask = user_mask ^ submask
                previous_cost = dp[used_drivers - 1][previous_mask]
                route_cost = route_costs[driver_index][submask]

                if previous_cost < INF and route_cost < INF:
                    candidate = previous_cost + route_cost
                    if candidate < dp[used_drivers][user_mask] - EPSILON:
                        dp[used_drivers][user_mask] = candidate
                        parent[used_drivers][user_mask] = submask

                if submask == 0:
                    break
                submask = (submask - 1) & user_mask

    if dp[driver_count][all_users_mask] == INF:
        raise ValueError("No feasible assignment: driver capacities cannot cover all requests.")

    groups_reversed: list[RoutePlan] = []
    user_mask = all_users_mask

    for used_drivers in range(driver_count, 0, -1):
        driver_index = used_drivers - 1
        group_mask = parent[used_drivers][user_mask]

        if group_mask < 0:
            raise RuntimeError("Optimizer reconstruction failed.")

        member_indices = _indices_from_mask(group_mask, user_count)
        groups_reversed.append(
            build_route_plan(
                driver=drivers[driver_index],
                requests=requests,
                member_indices=member_indices,
                route_order_indices=route_orders[driver_index][group_mask],
                cost=route_costs[driver_index][group_mask],
            )
        )
        user_mask ^= group_mask

    groups = tuple(reversed(groups_reversed))
    return OptimizationResult(groups=groups, total_cost=dp[driver_count][all_users_mask])


def optimize_passenger_pools(
    requests: Sequence[RideRequest],
    pool_count: int,
    max_pool_size: int,
) -> PoolOptimizationResult:
    """
    Pool passengers without using driver positions.

    For each candidate pool, the route starts at that pool's source centroid,
    then Held-Karp optimizes the order of passenger destinations. This solves
    the driver-independent pooling phase before Hungarian driver assignment.
    """

    _validate_pooling_problem(requests, pool_count, max_pool_size)

    user_count = len(requests)
    target_pool_count = min(pool_count, user_count)
    all_users_mask = (1 << user_count) - 1
    mask_count = 1 << user_count

    pool_costs = [INF] * mask_count
    pool_orders: list[tuple[int, ...]] = [()] * mask_count
    pool_centroids: list[Point] = [(0.0, 0.0)] * mask_count

    for user_mask in range(1, mask_count):
        if user_mask.bit_count() > max_pool_size:
            continue

        indices = _indices_from_mask(user_mask, user_count)
        centroid = _centroid(tuple(requests[index].source for index in indices))
        cost, route_order = _held_karp_indices(centroid, requests, indices)
        pool_costs[user_mask] = cost
        pool_orders[user_mask] = route_order
        pool_centroids[user_mask] = centroid

    dp: list[list[float]] = [[INF] * mask_count for _ in range(target_pool_count + 1)]
    parent: list[list[int]] = [[-1] * mask_count for _ in range(target_pool_count + 1)]
    dp[0][0] = 0.0
    parent[0][0] = 0

    for used_pools in range(1, target_pool_count + 1):
        for user_mask in range(mask_count):
            submask = user_mask

            while submask:
                previous_mask = user_mask ^ submask
                previous_cost = dp[used_pools - 1][previous_mask]
                pool_cost = pool_costs[submask]

                if previous_cost < INF and pool_cost < INF:
                    candidate = previous_cost + pool_cost
                    if candidate < dp[used_pools][user_mask] - EPSILON:
                        dp[used_pools][user_mask] = candidate
                        parent[used_pools][user_mask] = submask

                submask = (submask - 1) & user_mask

    if dp[target_pool_count][all_users_mask] == INF:
        raise ValueError("No feasible passenger pooling assignment.")

    pools_reversed: list[PoolPlan] = []
    user_mask = all_users_mask

    for used_pools in range(target_pool_count, 0, -1):
        pool_mask = parent[used_pools][user_mask]
        if pool_mask < 0:
            raise RuntimeError("Passenger pool reconstruction failed.")

        member_indices = _indices_from_mask(pool_mask, user_count)
        pool_id = f"pool-{used_pools}"
        pools_reversed.append(
            build_pool_plan(
                pool_id=pool_id,
                requests=requests,
                member_indices=member_indices,
                route_order_indices=pool_orders[pool_mask],
                centroid=pool_centroids[pool_mask],
                cost=pool_costs[pool_mask],
            )
        )
        user_mask ^= pool_mask

    pools = tuple(reversed(pools_reversed))
    return PoolOptimizationResult(pools=pools, total_cost=dp[target_pool_count][all_users_mask])


def assign_drivers_to_pools(
    pools: Sequence[PassengerPool],
    drivers: Sequence[Driver],
) -> OptimizationResult:
    """
    Assign already-built passenger pools to drivers using Hungarian matching.

    Edge weight ``w(pool, driver)`` is the Held-Karp route cost for that driver
    to drop off all passengers inside the pool. Each pool receives exactly one
    driver, and each driver can receive at most one pool.
    """

    _validate_pool_assignment_problem(pools, drivers)

    if not pools:
        return OptimizationResult(groups=(), total_cost=0.0)

    driver_count = len(drivers)
    cost_matrix: list[list[float]] = [[INF] * driver_count for _ in pools]
    route_orders: list[list[tuple[int, ...]]] = [[()] * driver_count for _ in pools]

    for pool_index, pool in enumerate(pools):
        member_indices = tuple(range(len(pool.requests)))

        for driver_index, driver in enumerate(drivers):
            if len(pool.requests) > driver.capacity:
                continue

            cost, route_order = _held_karp_indices(
                driver.current_location,
                pool.requests,
                member_indices,
            )
            cost_matrix[pool_index][driver_index] = cost
            route_orders[pool_index][driver_index] = route_order

    assignment = _hungarian_min_cost(cost_matrix)
    groups: list[RoutePlan] = []
    total_cost = 0.0

    for pool_index, driver_index in enumerate(assignment):
        route_cost = cost_matrix[pool_index][driver_index]
        if route_cost == INF:
            raise ValueError("No feasible driver-to-pool assignment.")

        pool = pools[pool_index]
        groups.append(
            build_route_plan(
                driver=drivers[driver_index],
                requests=pool.requests,
                member_indices=tuple(range(len(pool.requests))),
                route_order_indices=route_orders[pool_index][driver_index],
                cost=route_cost,
                pool_id=pool.id,
            )
        )
        total_cost += route_cost

    return OptimizationResult(groups=tuple(groups), total_cost=total_cost)


def assign_pools_to_drivers(
    pools: Sequence[PassengerPool],
    drivers: Sequence[Driver],
) -> OptimizationResult:
    """
    Match pools to drivers when the two counts may differ.

    This generalizes :func:`assign_drivers_to_pools`, which requires
    ``len(pools) <= len(drivers)``. Here each driver still serves at most one
    pool and each pool at most one driver, but only ``min(len(pools),
    len(drivers))`` of them are matched at minimum total Held-Karp cost. Any
    leftover pools (when pools outnumber drivers) are left unassigned and simply
    excluded from the result, so the caller can keep them queued for a later
    pass. Returns an empty result when either side is empty.
    """

    if not pools or not drivers:
        return OptimizationResult(groups=(), total_cost=0.0)

    for pool in pools:
        if not pool.id:
            raise ValueError("Pool id must be non-empty.")
        if not pool.requests:
            raise ValueError(f"Pool {pool.id} must contain at least one request.")
        for request in pool.requests:
            _validate_request(request)
    for driver in drivers:
        _validate_driver(driver)

    pool_count = len(pools)
    driver_count = len(drivers)
    cost_matrix: list[list[float]] = [[INF] * driver_count for _ in pools]
    route_orders: list[list[tuple[int, ...]]] = [[()] * driver_count for _ in pools]

    for pool_index, pool in enumerate(pools):
        member_indices = tuple(range(len(pool.requests)))

        for driver_index, driver in enumerate(drivers):
            if len(pool.requests) > driver.capacity:
                continue

            cost, route_order = _held_karp_indices(
                driver.current_location,
                pool.requests,
                member_indices,
            )
            cost_matrix[pool_index][driver_index] = cost
            route_orders[pool_index][driver_index] = route_order

    # Hungarian needs rows <= columns, so orient the matrix on the smaller side
    # and read the assignment back accordingly.
    if pool_count <= driver_count:
        assignment = _hungarian_min_cost(cost_matrix)
        pairs = [(pool_index, assignment[pool_index]) for pool_index in range(pool_count)]
    else:
        transposed = [
            [cost_matrix[pool_index][driver_index] for pool_index in range(pool_count)]
            for driver_index in range(driver_count)
        ]
        assignment = _hungarian_min_cost(transposed)
        pairs = [(assignment[driver_index], driver_index) for driver_index in range(driver_count)]

    groups: list[RoutePlan] = []
    total_cost = 0.0

    for pool_index, driver_index in pairs:
        route_cost = cost_matrix[pool_index][driver_index]
        if route_cost == INF:
            # No capacity-feasible driver for this pool; leave it unassigned.
            continue

        pool = pools[pool_index]
        groups.append(
            build_route_plan(
                driver=drivers[driver_index],
                requests=pool.requests,
                member_indices=tuple(range(len(pool.requests))),
                route_order_indices=route_orders[pool_index][driver_index],
                cost=route_cost,
                pool_id=pool.id,
            )
        )
        total_cost += route_cost

    return OptimizationResult(groups=tuple(groups), total_cost=total_cost)


def pools_from_groups(groups: Sequence[RoutePlan]) -> tuple[PassengerPool, ...]:
    """Convert existing group output into driver-independent passenger pools."""

    pools: list[PassengerPool] = []

    for index, group in enumerate(groups):
        if not group.passengers:
            continue

        pool_id = group.pool_id or f"pool-{index + 1}"
        pools.append(
            PassengerPool(
                id=pool_id,
                requests=tuple(
                    RideRequest(
                        id=passenger.user_id,
                        source=passenger.source,
                        destination=passenger.destination,
                    )
                    for passenger in group.passengers
                ),
            )
        )

    return tuple(pools)


def pools_from_pool_plans(pool_plans: Sequence[PoolPlan]) -> tuple[PassengerPool, ...]:
    """Convert centroid-optimized pool plans into Hungarian assignment input."""

    return tuple(
        PassengerPool(
            id=pool_plan.pool_id,
            requests=tuple(
                RideRequest(
                    id=passenger.user_id,
                    source=passenger.source,
                    destination=passenger.destination,
                )
                for passenger in pool_plan.passengers
            ),
        )
        for pool_plan in pool_plans
    )


def build_pool_plan(
    pool_id: str,
    requests: Sequence[RideRequest],
    member_indices: tuple[int, ...],
    route_order_indices: tuple[int, ...],
    centroid: Point,
    cost: float,
) -> PoolPlan:
    """Build the driver-independent pool output with centroid-based track."""

    passengers = tuple(
        PassengerAssignment(
            user_id=requests[index].id,
            source=requests[index].source,
            destination=requests[index].destination,
        )
        for index in member_indices
    )
    track = (centroid,) + tuple(requests[index].destination for index in route_order_indices)

    return PoolPlan(
        pool_id=pool_id,
        passengers=passengers,
        centroid=centroid,
        track=track,
        user_ids=tuple(requests[index].id for index in member_indices),
        dropoff_order=tuple(requests[index].id for index in route_order_indices),
        cost=cost,
    )


def build_route_plan(
    driver: Driver,
    requests: Sequence[RideRequest],
    member_indices: tuple[int, ...],
    route_order_indices: tuple[int, ...],
    cost: float,
    pool_id: str | None = None,
) -> RoutePlan:
    """Build the final group output with passengers and optimized coordinate track."""

    passengers = tuple(
        PassengerAssignment(
            user_id=requests[index].id,
            source=requests[index].source,
            destination=requests[index].destination,
        )
        for index in member_indices
    )
    track = (driver.current_location,) + tuple(
        requests[index].destination for index in route_order_indices
    )

    return RoutePlan(
        driver_id=driver.id,
        passengers=passengers,
        track=track,
        user_ids=tuple(requests[index].id for index in member_indices),
        dropoff_order=tuple(requests[index].id for index in route_order_indices),
        cost=cost,
        pool_id=pool_id,
    )


def _held_karp_indices(
    start: Point,
    requests: Sequence[RideRequest],
    request_indices: tuple[int, ...],
) -> tuple[float, tuple[int, ...]]:
    if not request_indices:
        return 0.0, ()

    local_count = len(request_indices)
    full_mask = (1 << local_count) - 1
    dp: list[list[float]] = [[INF] * local_count for _ in range(1 << local_count)]
    parent: list[list[int]] = [[-1] * local_count for _ in range(1 << local_count)]

    for local_index, request_index in enumerate(request_indices):
        destination = requests[request_index].destination
        dp[1 << local_index][local_index] = euclidean_distance(start, destination)

    for visited_mask in range(1 << local_count):
        for last in range(local_count):
            current_cost = dp[visited_mask][last]
            if current_cost == INF:
                continue

            last_destination = requests[request_indices[last]].destination

            for next_index in range(local_count):
                if visited_mask & (1 << next_index):
                    continue

                next_mask = visited_mask | (1 << next_index)
                next_destination = requests[request_indices[next_index]].destination
                candidate = current_cost + euclidean_distance(last_destination, next_destination)

                if candidate < dp[next_mask][next_index] - EPSILON:
                    dp[next_mask][next_index] = candidate
                    parent[next_mask][next_index] = last

    best_last = min(range(local_count), key=lambda last: dp[full_mask][last])
    best_cost = dp[full_mask][best_last]
    route: list[int] = []
    visited_mask = full_mask
    current = best_last

    while current != -1:
        route.append(request_indices[current])
        previous = parent[visited_mask][current]
        visited_mask ^= 1 << current
        current = previous

    route.reverse()
    return best_cost, tuple(route)


def _hungarian_min_cost(cost_matrix: Sequence[Sequence[float]]) -> tuple[int, ...]:
    """
    Solve rectangular min-cost assignment for rows <= columns.

    Returns ``assignment[row_index] = column_index``.
    """

    row_count = len(cost_matrix)
    if row_count == 0:
        return ()

    column_count = len(cost_matrix[0])
    if row_count > column_count:
        raise ValueError("Hungarian matching requires at least as many drivers as pools.")

    for row in cost_matrix:
        if len(row) != column_count:
            raise ValueError("Cost matrix rows must all have the same length.")
        if not any(cost < INF for cost in row):
            raise ValueError("At least one pool cannot be served by any driver.")

    finite_values = [cost for row in cost_matrix for cost in row if cost < INF]
    large_cost = (max(finite_values) + 1.0) * (row_count * column_count + 1)
    normalized_cost = [
        [cost if cost < INF else large_cost for cost in row]
        for row in cost_matrix
    ]

    potentials_rows = [0.0] * (row_count + 1)
    potentials_columns = [0.0] * (column_count + 1)
    matching = [0] * (column_count + 1)
    way = [0] * (column_count + 1)

    for row_index in range(1, row_count + 1):
        matching[0] = row_index
        current_column = 0
        min_values = [INF] * (column_count + 1)
        used = [False] * (column_count + 1)

        while True:
            used[current_column] = True
            current_row = matching[current_column]
            delta = INF
            next_column = 0

            for column_index in range(1, column_count + 1):
                if used[column_index]:
                    continue

                current_value = (
                    normalized_cost[current_row - 1][column_index - 1]
                    - potentials_rows[current_row]
                    - potentials_columns[column_index]
                )
                if current_value < min_values[column_index] - EPSILON:
                    min_values[column_index] = current_value
                    way[column_index] = current_column
                if min_values[column_index] < delta - EPSILON:
                    delta = min_values[column_index]
                    next_column = column_index

            for column_index in range(column_count + 1):
                if used[column_index]:
                    potentials_rows[matching[column_index]] += delta
                    potentials_columns[column_index] -= delta
                else:
                    min_values[column_index] -= delta

            current_column = next_column
            if matching[current_column] == 0:
                break

        while True:
            previous_column = way[current_column]
            matching[current_column] = matching[previous_column]
            current_column = previous_column
            if current_column == 0:
                break

    assignment = [-1] * row_count
    for column_index in range(1, column_count + 1):
        row_index = matching[column_index]
        if row_index != 0:
            assignment[row_index - 1] = column_index - 1

    if any(column_index < 0 for column_index in assignment):
        raise RuntimeError("Hungarian matching failed to assign all pools.")

    return tuple(assignment)


def _validate_problem(requests: Sequence[RideRequest], drivers: Sequence[Driver]) -> None:
    if not drivers:
        raise ValueError("At least one driver is required.")

    request_ids: set[str] = set()
    for request in requests:
        _validate_request(request)
        if request.id in request_ids:
            raise ValueError(f"Duplicate request id: {request.id}")
        request_ids.add(request.id)

    driver_ids: set[str] = set()
    total_capacity = 0
    for driver in drivers:
        _validate_driver(driver)
        if driver.id in driver_ids:
            raise ValueError(f"Duplicate driver id: {driver.id}")
        driver_ids.add(driver.id)
        total_capacity += driver.capacity

    if total_capacity < len(requests):
        raise ValueError("Total driver capacity is smaller than request count.")


def _validate_pool_assignment_problem(
    pools: Sequence[PassengerPool],
    drivers: Sequence[Driver],
) -> None:
    if len(pools) > len(drivers):
        raise ValueError("There must be at least as many drivers as passenger pools.")

    pool_ids: set[str] = set()
    request_ids: set[str] = set()

    for pool in pools:
        if not pool.id:
            raise ValueError("Pool id must be non-empty.")
        if pool.id in pool_ids:
            raise ValueError(f"Duplicate pool id: {pool.id}")
        if not pool.requests:
            raise ValueError(f"Pool {pool.id} must contain at least one request.")
        pool_ids.add(pool.id)

        for request in pool.requests:
            _validate_request(request)
            if request.id in request_ids:
                raise ValueError(f"Duplicate request id across pools: {request.id}")
            request_ids.add(request.id)

    driver_ids: set[str] = set()
    for driver in drivers:
        _validate_driver(driver)
        if driver.id in driver_ids:
            raise ValueError(f"Duplicate driver id: {driver.id}")
        driver_ids.add(driver.id)

    for pool in pools:
        if not any(len(pool.requests) <= driver.capacity for driver in drivers):
            raise ValueError(f"No driver can serve pool {pool.id} because of capacity.")


def _validate_pooling_problem(
    requests: Sequence[RideRequest],
    pool_count: int,
    max_pool_size: int,
) -> None:
    if not requests:
        raise ValueError("At least one request is required.")
    if pool_count <= 0:
        raise ValueError("pool_count must be positive.")
    if max_pool_size <= 0:
        raise ValueError("max_pool_size must be positive.")

    request_ids: set[str] = set()
    for request in requests:
        _validate_request(request)
        if request.id in request_ids:
            raise ValueError(f"Duplicate request id: {request.id}")
        request_ids.add(request.id)

    target_pool_count = min(pool_count, len(requests))
    if target_pool_count * max_pool_size < len(requests):
        raise ValueError("pool_count and max_pool_size cannot cover all requests.")


def _validate_request(request: RideRequest) -> None:
    if not request.id:
        raise ValueError("Request id must be non-empty.")
    _validate_point(f"request {request.id} source", request.source)
    _validate_point(f"request {request.id} destination", request.destination)


def _validate_driver(driver: Driver) -> None:
    if not driver.id:
        raise ValueError("Driver id must be non-empty.")
    if driver.capacity < 0:
        raise ValueError(f"Driver {driver.id} capacity must be non-negative.")
    _validate_point(f"driver {driver.id} current_location", driver.current_location)


def _validate_point(name: str, point: Point) -> None:
    if len(point) != 2:
        raise ValueError(f"{name} must be a 2D coordinate: (lng, lat).")

    lng, lat = point
    if not isfinite(lng) or not isfinite(lat):
        raise ValueError(f"{name} must contain finite numbers.")


def _indices_from_mask(mask: int, item_count: int) -> tuple[int, ...]:
    return tuple(index for index in range(item_count) if mask & (1 << index))


def _centroid(points: Sequence[Point]) -> Point:
    if not points:
        raise ValueError("Cannot compute centroid of an empty point set.")

    lng_sum = sum(point[0] for point in points)
    lat_sum = sum(point[1] for point in points)
    return lng_sum / len(points), lat_sum / len(points)
