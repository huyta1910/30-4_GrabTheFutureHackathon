# Optimizer Algorithm

This optimizer solves two related problems:

1. Build passenger pools without using driver positions.
2. Assign available drivers to those fixed pools with minimum delivery route cost.

All coordinates are treated as 2D `(lng, lat)` points, and every distance is Euclidean distance.

```text
dist(a, b) = sqrt((a.lng - b.lng)^2 + (a.lat - b.lat)^2)
```

## Data Model

### RideRequest

Each passenger request has:

```text
id
source = (lng, lat)
destination = (lng, lat)
```

The source is used to compute a pool centroid. The destination is used in the route optimization.

### Driver

Each driver has:

```text
id
current_location = (lng, lat)
capacity
```

The current location is the start point for the final driver route after the passenger pool has been assigned.

### Output

The optimizer returns:

```text
groups: list of assigned driver routes
total_cost: sum of all assigned route costs
```

Each group contains:

```text
driver_id
passengers: list of passenger coordinate records
track: optimized coordinate path
user_ids: passenger IDs inside the group
dropoff_order: optimized passenger drop-off order
cost
pool_id
```

For passenger-only pooling, the output is:

```text
pools: list of passenger pools
total_cost: sum of centroid-based pool costs
```

Each pool contains:

```text
pool_id
passengers
centroid
track: centroid -> optimized drop-off destinations
user_ids
dropoff_order
cost
```

## Problem 1: Passenger Pooling

Function:

```text
optimize_passenger_pools(requests, pool_count, max_pool_size)
```

Goal:

Partition `N` passengers into `K` pools, where:

```text
K = min(pool_count, N)
```

The outer DP fills exactly `K` non-empty pools (the inner loop only
iterates non-empty submasks, so there is no carry-empty-pool transition).
This is always feasible because the `min(pool_count, N)` clamp guarantees
`K <= N`, and any `N` items can be split into exactly `K` non-empty groups.
Do not drop the clamp to `pool_count`: with `pool_count > N`, the DP could
never reach `dp[K][all]` and pooling would fail.

Each pool contains at most `max_pool_size` passengers. The optimizer minimizes:

```text
sum cost(pool_j), for j = 1..K
```

For each candidate pool:

1. Compute the centroid from passenger source coordinates.
2. Start at the centroid.
3. Visit every passenger destination exactly once.
4. Use Held-Karp DP to find the minimum path cost.
5. Do not return to the centroid.

The centroid is:

```text
centroid.lng = sum(source.lng) / pool_size
centroid.lat = sum(source.lat) / pool_size
```

### Pool Cost

For a pool `S`:

```text
z(S) = shortest path cost from centroid(S) to all destinations in S
```

This is a TSP path variant, not a TSP cycle.

Example path:

```text
centroid(S) -> destination(u3) -> destination(u1) -> destination(u2)
```

### Outer DP For Pooling

Passengers are represented by bitmasks.

```text
mask = set of passengers already covered
submask = one candidate pool
```

State:

```text
dp[k][mask] = minimum cost to cover exactly passengers in mask using k pools
```

Transition:

```text
dp[k][mask] = min(
    dp[k - 1][mask ^ submask] + pool_cost[submask]
)
```

where:

```text
submask is a non-empty subset of mask
size(submask) <= max_pool_size
```

Base case:

```text
dp[0][0] = 0
```

Answer:

```text
dp[K][all_passengers_mask]
```

Parent pointers are stored to reconstruct the selected pools.

### Pooling Pseudo-Code

```text
function optimize_passenger_pools(requests, pool_count, max_pool_size):
    K = min(pool_count, len(requests))
    all_mask = (1 << N) - 1

    for submask in 1..all_mask:
        if bitcount(submask) > max_pool_size:
            continue

        members = passengers in submask
        centroid = average source coordinate of members
        pool_cost[submask], pool_order[submask] =
            held_karp_path(centroid, members)

    dp[0][0] = 0

    for k in 1..K:
        for mask in 0..all_mask:
            for each non-empty submask of mask:
                candidate = dp[k - 1][mask ^ submask] + pool_cost[submask]
                relax dp[k][mask]

    reconstruct selected pool masks from parent pointers
    return PoolOptimizationResult
```

## Problem 2: Driver Assignment To Pools

Function:

```text
assign_drivers_to_pools(pools, drivers)
```

Input:

```text
fixed passenger pools
available drivers
```

Goal:

Assign each pool to exactly one driver, and assign each driver to at most one pool, minimizing:

```text
sum w(pool_i, driver_j)
```

The edge weight is:

```text
w(pool_i, driver_j) = shortest path cost from driver_j.current_location
                      to all destinations in pool_i
```

This edge weight is also solved by Held-Karp.

If a pool has more passengers than a driver's capacity, that edge is infeasible:

```text
w(pool_i, driver_j) = INF
```

### Cost Matrix

Build a rectangular matrix:

```text
rows = pools
columns = drivers
cost_matrix[i][j] = w(pool_i, driver_j)
```

The assignment requires:

```text
number_of_pools <= number_of_drivers
```

### Hungarian Matching

The Hungarian algorithm solves:

```text
min sum cost_matrix[row][assignment[row]]
```

subject to:

```text
each row gets one unique column
each column is used at most once
```

The implementation supports rectangular matrices where:

```text
rows <= columns
```

After Hungarian returns the selected driver for each pool, the optimizer rebuilds each final route using the saved Held-Karp drop-off order.

### Assignment Pseudo-Code

```text
function assign_drivers_to_pools(pools, drivers):
    for each pool i:
        for each driver j:
            if len(pool.requests) > driver.capacity:
                cost_matrix[i][j] = INF
            else:
                cost_matrix[i][j], route_order[i][j] =
                    held_karp_path(driver.current_location, pool.requests)

    assignment = hungarian_min_cost(cost_matrix)

    for each pool i:
        j = assignment[i]
        build RoutePlan using driver j, pool i, and route_order[i][j]

    return OptimizationResult
```

## Held-Karp TSP Path

Function:

```text
held_karp_path(start, requests)
```

This solves the shortest path that:

1. Starts at `start`.
2. Visits every passenger destination exactly once.
3. Does not return to the start.

State:

```text
dp[mask][last] = minimum cost to start at start,
                 visit destinations in mask,
                 and end at destination last
```

Base case:

```text
dp[1 << i][i] = dist(start, destination_i)
```

Transition:

```text
dp[mask | (1 << next)][next] =
    min(
        dp[mask][last] + dist(destination_last, destination_next)
    )
```

Answer:

```text
min dp[full_mask][last]
```

Parent pointers reconstruct the optimized drop-off order.

### Held-Karp Pseudo-Code

```text
function held_karp_path(start, requests):
    for each destination i:
        dp[1 << i][i] = dist(start, destination_i)

    for mask in all masks:
        for last in mask:
            for next not in mask:
                relax dp[mask | (1 << next)][next]

    best_last = argmin dp[full_mask][last]
    reconstruct order from parent pointers

    return best_cost, dropoff_order
```

## Full Recommended Workflow

Use this workflow when passengers should be pooled first, then drivers should be assigned later:

```text
pool_count = min(number_of_available_drivers, number_of_passengers)

if pool_count == 0:
    skip optimizer

pool_result = optimize_passenger_pools(
    requests=passengers,
    pool_count=pool_count,
    max_pool_size=driver_capacity_limit,
)

pools = pools_from_pool_plans(pool_result.pools)

assignment_result = assign_drivers_to_pools(
    pools=pools,
    drivers=available_drivers,
)
```

The final API should usually return `assignment_result.groups`.

Each group already contains:

```text
passengers with source/destination coordinates
track = driver.current_location -> optimized drop-off destinations
```

## Legacy Combined Optimizer

Function:

```text
optimize_groups(requests, drivers)
```

This function solves an older combined problem:

```text
assign passengers directly to drivers
```

For each possible driver/passenger subset, it computes Held-Karp route cost from that driver's current location. Then an outer DP chooses one subset per driver.

This is exact, but it uses driver positions during grouping. For the newer two-stage design, prefer:

```text
optimize_passenger_pools -> assign_drivers_to_pools
```

## Validation Rules

The optimizer validates:

```text
request IDs are non-empty
request IDs are unique
driver IDs are non-empty
driver IDs are unique
pool IDs are non-empty
pool IDs are unique
coordinates are finite 2D points
driver capacity is non-negative
total capacity can cover all passengers
pool_count and max_pool_size can cover all passengers
each pool can be served by at least one driver
```

## Complexity

Let:

```text
N = number of passengers
M = number of drivers
K = number of pools
C = max pool size
```

Held-Karp for one group of size `s`:

```text
O(s^2 * 2^s)
```

Passenger pooling candidate generation:

```text
O(sum over valid subsets S of |S|^2 * 2^|S|)
```

Passenger pooling outer DP:

```text
O(K * 3^N)
```

Driver assignment cost matrix:

```text
O(K * M * C^2 * 2^C)
```

Hungarian matching:

```text
O(K^2 * M)
```

for rectangular matching with `K <= M`.

The exact algorithms are best for small or medium `N`. For larger production cases, a heuristic or approximation layer should be added before these exact solvers.

## Checker

The checker in `test/checker.py` compares the optimized algorithms against brute force implementations from `test/brute_force.py`.

It validates both stages:

```text
passenger pooling optimizer
Hungarian pool assignment
```

Generated test data is stored in:

```text
test/test.inp
test/test.out
test/checker.log
```

