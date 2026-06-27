from __future__ import annotations

import json
import random
import sys
from math import ceil
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[3]))

from app.optimizer.core import Driver, RideRequest, optimize_passenger_pools, pools_from_pool_plans
from app.optimizer.test.brute_force import brute_force_assign_drivers_to_pools

DEFAULT_TEST_DIR = Path(__file__).resolve().parent
DEFAULT_INPUT_PATH = DEFAULT_TEST_DIR / "test.inp"
DEFAULT_OUTPUT_PATH = DEFAULT_TEST_DIR / "test.out"
DEFAULT_CASES = 100
DEFAULT_N = 5
DEFAULT_SEED = 20260627


def main() -> None:
    rng = random.Random(DEFAULT_SEED)
    inputs = []
    outputs = []

    for case_index in range(DEFAULT_CASES):
        request_count = DEFAULT_N
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
        pooling = optimize_passenger_pools(
            requests,
            pool_count=pool_count,
            max_pool_size=ceil(request_count / pool_count),
        )
        final = brute_force_assign_drivers_to_pools(
            pools_from_pool_plans(pooling.pools),
            drivers,
        )

        inputs.append(
            {
                "case_name": f"case_{case_index + 1:03d}",
                "requests": [_request_to_json(request) for request in requests],
                "drivers": [_driver_to_json(driver) for driver in drivers],
            }
        )
        outputs.append({"case_name": f"case_{case_index + 1:03d}", "total_cost": final.total_cost})

    DEFAULT_INPUT_PATH.write_text(json.dumps(inputs, indent=2), encoding="utf-8")
    DEFAULT_OUTPUT_PATH.write_text(json.dumps(outputs, indent=2), encoding="utf-8")
    print(f"Wrote {DEFAULT_INPUT_PATH}")
    print(f"Wrote {DEFAULT_OUTPUT_PATH}")


def _point(rng: random.Random) -> tuple[float, float]:
    return (round(rng.uniform(-20, 20), 3), round(rng.uniform(-20, 20), 3))


def _request_to_json(request: RideRequest) -> dict[str, object]:
    return {
        "id": request.id,
        "source": list(request.source),
        "destination": list(request.destination),
    }


def _driver_to_json(driver: Driver) -> dict[str, object]:
    return {
        "id": driver.id,
        "current_location": list(driver.current_location),
        "capacity": driver.capacity,
    }


if __name__ == "__main__":
    main()
