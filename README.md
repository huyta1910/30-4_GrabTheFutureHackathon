# Adaptive AI Ride Pooling

Adaptive AI Ride Pooling is a full-stack hackathon prototype for shared ride booking under bad-weather demand spikes. The app connects passenger ride requests, AI-assisted pool matching, driver pool approval, route navigation, weather alerts, trip completion, and fare sharing in one demo flow.

## Demo Flow

```text
Weather alert -> passenger notification -> passenger books ride
-> AI matching creates a shared pool -> driver accepts/declines
-> navigation/trip lifecycle -> trip completed -> fare and history updated
```

Key behaviors:

- Passengers receive heavy-rain alerts and can jump directly to booking.
- Passengers enter pickup/dropoff addresses with Vietnam administrative location support.
- Ride requests include real pickup/dropoff coordinates when available.
- AI matching groups compatible passengers into pools.
- Drivers see pool suggestions with map, route, distance, duration, stops, congestion zones, and shared fare.
- Pool fare is calculated from route distance: `distance_km * 3000 / passenger_count`.
- Drivers manage trip lifecycle: `assigned -> en_route -> in_progress -> completed`.
- Passenger and driver dashboards refresh after completion or cancellation.

## Tech Stack

Frontend:

- React 19, Vite, TypeScript
- React Router
- TanStack Query
- React Hook Form
- Axios
- TailwindCSS
- Leaflet / React Leaflet
- Lucide icons

Backend:

- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- Pydantic
- Repository pattern + service layer + dependency injection

Infrastructure:

- Docker Compose
- PostgreSQL seed data
- Optional VietMap route API for road distance/duration

## Repository Layout

```text
backend/
  app/api/              FastAPI routers
  app/models/           SQLAlchemy models
  app/repositories/     database access layer
  app/services/         business logic
  app/schemas/          Pydantic request/response models
  app/optimizer/        ride pooling and assignment logic
  alembic/              database migrations

frontend/
  src/components/       UI components
  src/features/         typed API clients, hooks, feature logic
  src/pages/            route pages
  src/routes/           app routes

database/seeds/         mock demo data
docker/                 Dockerfiles
docs/                   supplementary docs
```

## Quick Start

1. Create environment file:

```bash
cp .env.example .env
```

2. Start the stack:

```bash
docker compose up --build
```

3. Open the app:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

The backend runs Alembic migrations on startup. PostgreSQL is exposed on port `5432`.

## Environment

Important variables:

```env
DATABASE_URL=postgresql+psycopg://adaptive_user:adaptive_password@db:5432/adaptive_ride_pooling
BACKEND_CORS_ORIGINS=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8000/api/v1

ROUTING_ENABLED=true
VIETMAP_API_KEY=
VIETMAP_ROUTE_URL=https://maps.vietmap.vn/api/route
ROUTING_TIMEOUT_SECONDS=4.0
```

If `VIETMAP_API_KEY` is empty, routing falls back to the local mock route. The app still works, but real road distance/duration may be unavailable.

## Demo Accounts and IDs

Seed data is stored in `database/seeds/001_mock_data.sql`.

Useful demo IDs:

```text
Passenger A:
  passenger_id = 00000000-0000-0000-0000-000000000201
  user_id      = 00000000-0000-0000-0000-000000000101

Passenger B:
  passenger_id = 00000000-0000-0000-0000-000000000202
  user_id      = 00000000-0000-0000-0000-000000000103

Demo driver:
  driver_id = 00000000-0000-0000-0000-000000000301
  user_id   = 00000000-0000-0000-0000-000000000102
```

The seed includes 10 active drivers with coordinates for matching tests.

To target a specific driver in the UI, use:

```text
/dashboard/driver?driverId=00000000-0000-0000-0000-000000000301
```

Driver pool page:

```text
/dashboard/driver/pool?driverId=00000000-0000-0000-0000-000000000301
```

Passenger dashboard:

```text
/dashboard/passenger
```

## Core API Endpoints

Base URL:

```text
http://localhost:8000/api/v1
```

System:

- `GET /health`
- `GET /status`

Passenger:

- `GET /passengers/{passenger_id}/dashboard`
- `GET /passengers/{passenger_id}/profile`
- `PATCH /passengers/{passenger_id}/profile`
- `POST /passengers/{passenger_id}/rides`
- `GET /passengers/{passenger_id}/rides/status`
- `PATCH /passengers/{passenger_id}/rides/current/cancel`
- `GET /passengers/{passenger_id}/rides/history`
- `GET /passengers/{passenger_id}/notifications`
- `PATCH /passengers/{passenger_id}/notifications/{notification_id}/read`

Driver:

- `GET /drivers/{driver_id}/dashboard`
- `PATCH /drivers/{driver_id}/availability`
- `GET /drivers/{driver_id}/pool-suggestions`
- `GET /drivers/{driver_id}/pool-suggestions/{group_id}`
- `PATCH /drivers/{driver_id}/pool-suggestions/{group_id}/respond`
- `PATCH /drivers/{driver_id}/pool-suggestions/{group_id}/complete`
- `GET /drivers/{driver_id}/trips`
- `GET /drivers/{driver_id}/trips/{trip_id}`
- `PATCH /drivers/{driver_id}/trips/{trip_id}/status`
- `GET /drivers/{driver_id}/earnings`
- `GET /drivers/{driver_id}/notifications`
- `PATCH /drivers/{driver_id}/notifications/{notification_id}/read`
- `GET /drivers/{driver_id}/profile`
- `PATCH /drivers/{driver_id}/profile`

Matching and weather:

- `POST /matching/run`
- `POST /weather/alerts`

## Example Demo Requests

Raise a rain alert:

```bash
curl -X POST http://localhost:8000/api/v1/weather/alerts \
  -H "Content-Type: application/json" \
  -d '{"location_label":"Ho Chi Minh City","severity":"heavy","minutes_until_rain":20}'
```

Create a passenger ride:

```bash
curl -X POST http://localhost:8000/api/v1/passengers/00000000-0000-0000-0000-000000000201/rides \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_label":"188 Nguyen Xi, Phuong Binh Thanh, Thanh pho Ho Chi Minh",
    "dropoff_label":"Dai hoc Quoc Te, Phuong Linh Xuan, Thanh pho Ho Chi Minh",
    "pickup_latitude":"10.800387",
    "pickup_longitude":"106.708149",
    "dropoff_latitude":"10.748725",
    "dropoff_longitude":"106.685692"
  }'
```

Accept a pool:

```bash
curl -X PATCH http://localhost:8000/api/v1/drivers/00000000-0000-0000-0000-000000000301/pool-suggestions/{group_id}/respond \
  -H "Content-Type: application/json" \
  -d '{"action":"accept"}'
```

Advance trip status:

```bash
curl -X PATCH http://localhost:8000/api/v1/drivers/00000000-0000-0000-0000-000000000301/trips/{trip_id}/status \
  -H "Content-Type: application/json" \
  -d '{"status":"en_route"}'
```

Allowed trip lifecycle:

```text
assigned -> en_route -> in_progress -> completed
assigned/en_route/in_progress -> cancelled
```

## Fare Rules

Pool fare uses the displayed route distance:

```text
shared_fare = route_distance_km * 3000 / passenger_count
```

Examples:

```text
7.9 km, 1 passenger  -> 7.9 * 3000 / 1 = 23700 VND
7.9 km, 2 passengers -> 7.9 * 3000 / 2 = 11850 VND each
7.9 km, 3 passengers -> 7.9 * 3000 / 3 = 7900 VND each
```

The value is carried into:

- pool passenger rows
- pool total estimated fare
- driver active trip
- completed trip history
- passenger ride history
- driver earnings

## Development Commands

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

Backend:

```bash
cd backend
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

Docker:

```bash
docker compose up --build
docker compose ps
docker compose logs backend
docker compose logs frontend
```

## Testing and Validation

Common validation used during development:

```bash
docker compose exec -T backend python -m compileall app
cd frontend && npm.cmd run typecheck
cd frontend && npm.cmd run lint
```

On Windows PowerShell, use `npm.cmd` if script execution blocks `npm.ps1`.

## Notes for Demo Reset

If the database volume has old test data, reset it with:

```bash
docker compose down -v
docker compose up --build
```

If you run the seed manually, run the whole file from top to bottom. Some inserts depend on earlier `users`, `passengers`, and `drivers` rows.

## Project Status

Implemented:

- Passenger dashboard, booking, status, history, notifications, profile
- Driver dashboard, pool suggestions, map/navigation, trip lifecycle, earnings, notifications, profile
- Weather alert notifications
- AI pooling and driver assignment
- Route-aware shared fare calculation
- Dockerized frontend/backend/database

Known limitations:

- Authentication is demo-oriented.
- Weather alert targeting is currently broadcast to passengers.
- Real routing depends on a valid VietMap API key; otherwise the app uses fallback route behavior.
