-- Mock data for an end-to-end passenger <-> driver demo.
--
-- Identity map (frontend hardcodes / overrides these ids):
--   passenger A  -> passengers.id ...201 (users ...101)   [PassengerDashboardPage hardcodes ...201]
--   passenger B  -> passengers.id ...202 (users ...103)   [backend-only, feeds the driver demo]
--   driver       -> drivers.id     ...301 (users ...102)  [?driverId=...301 override]
--
-- Demo narrative (optimised for testing the live flow from the UI):
--   * Passenger A starts with NO active ride (only completed history) so the
--     request form is enabled -> create a ride live -> a pending pool appears
--     for the driver -> driver accepts -> A flips to "assigned".
--   * A seeded PENDING pool (...402, passenger B's booking) is always there for
--     the driver to accept even without creating a new request.
--   * The driver has 3 COMPLETED trips -> earnings/stats/history populated, and
--     no active trip until a pool is accepted.

INSERT INTO users (id, email, full_name, role, status)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'passenger@example.com', 'Sample Passenger', 'passenger', 'active'),
  ('00000000-0000-0000-0000-000000000103', 'passenger2@example.com', 'Sample Passenger Two', 'passenger', 'active'),
  ('00000000-0000-0000-0000-000000000102', 'driver@example.com', 'Sample Driver', 'driver', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO passengers (id, user_id, display_name)
VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Sample Passenger'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000103', 'Sample Passenger Two')
ON CONFLICT (id) DO NOTHING;

INSERT INTO drivers (id, user_id, license_number, vehicle_label, availability_status)
VALUES
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000102', 'SAMPLE-LICENSE-001', 'Toyota Vios - 51A-123.45', 'active')
ON CONFLICT (license_number) DO NOTHING;

-- Pool groups: ...401 leftover draft, ...402 pending (waiting for the driver to accept).
INSERT INTO ride_pool_groups (id, status, origin_area, destination_area, driver_id)
VALUES
  ('00000000-0000-0000-0000-000000000401', 'draft', 'Sample Origin', 'Sample Destination', NULL),
  ('00000000-0000-0000-0000-000000000402', 'pending', 'Phường Sài Gòn, Thành phố Hồ Chí Minh', 'Phường Bình Thạnh, Thành phố Hồ Chí Minh', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO bookings (
  id,
  passenger_id,
  pickup_label,
  dropoff_label,
  pickup_latitude,
  pickup_longitude,
  dropoff_latitude,
  dropoff_longitude,
  status,
  requested_at,
  estimated_fare
)
VALUES
  -- (1) PENDING pool member (passenger B) -> still matching, waiting for a driver to accept.
  (
    '00000000-0000-0000-0000-000000000601',
    '00000000-0000-0000-0000-000000000202',
    '22 Lê Duẩn, Phường Sài Gòn, Thành phố Hồ Chí Minh',
    '2 Nguyễn Hữu Cảnh, Phường Bình Thạnh, Thành phố Hồ Chí Minh',
    10.781761, 106.701623, 10.790457, 106.718821,
    'matching',
    NOW() - INTERVAL '10 minutes',
    47000.00
  ),
  -- (2-4) COMPLETED rides -> driver earnings + passenger history (A: 604/606, B: 605).
  (
    '00000000-0000-0000-0000-000000000604',
    '00000000-0000-0000-0000-000000000201',
    '268 Lý Thường Kiệt, Phường Diên Hồng, Thành phố Hồ Chí Minh',
    '1 Trường Sa, Phường Gia Định, Thành phố Hồ Chí Minh',
    10.762622, 106.682201, 10.795000, 106.705000,
    'completed',
    NOW() - INTERVAL '1 day',
    61000.00
  ),
  (
    '00000000-0000-0000-0000-000000000605',
    '00000000-0000-0000-0000-000000000202',
    '02 Hai Bà Trưng, Phường Sài Gòn, Thành phố Hồ Chí Minh',
    '161 Phan Xích Long, Phường Cầu Kiệu, Thành phố Hồ Chí Minh',
    10.776800, 106.703400, 10.798500, 106.688700,
    'completed',
    NOW() - INTERVAL '2 days',
    43000.00
  ),
  (
    '00000000-0000-0000-0000-000000000606',
    '00000000-0000-0000-0000-000000000201',
    '70 Phạm Ngọc Thạch, Phường Xuân Hòa, Thành phố Hồ Chí Minh',
    '06 Đồng Khởi, Phường Sài Gòn, Thành phố Hồ Chí Minh',
    10.786900, 106.695800, 10.776300, 106.703900,
    'completed',
    NOW() - INTERVAL '3 hours',
    38000.00
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO ride_pool_members (id, ride_pool_group_id, booking_id, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000701',
    '00000000-0000-0000-0000-000000000402',
    '00000000-0000-0000-0000-000000000601',
    'pending'
  )
ON CONFLICT (id) DO NOTHING;

-- Trip history: three completed trips for the driver (no active trip until a pool is accepted).
INSERT INTO trip_history (id, booking_id, driver_id, status, total_fare, completed_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000802',
    '00000000-0000-0000-0000-000000000604',
    '00000000-0000-0000-0000-000000000301',
    'completed',
    61000.00,
    NOW() - INTERVAL '1 day'
  ),
  (
    '00000000-0000-0000-0000-000000000803',
    '00000000-0000-0000-0000-000000000605',
    '00000000-0000-0000-0000-000000000301',
    'completed',
    43000.00,
    NOW() - INTERVAL '2 days'
  ),
  (
    '00000000-0000-0000-0000-000000000804',
    '00000000-0000-0000-0000-000000000606',
    '00000000-0000-0000-0000-000000000301',
    'completed',
    38000.00,
    NOW() - INTERVAL '3 hours'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (id, user_id, title, body, status)
VALUES
  -- Driver-facing.
  (
    '00000000-0000-0000-0000-000000000901',
    '00000000-0000-0000-0000-000000000102',
    'New pool suggestion',
    'A pool from Phường Sài Gòn to Phường Bình Thạnh is waiting for your response.',
    'unread'
  ),
  (
    '00000000-0000-0000-0000-000000000902',
    '00000000-0000-0000-0000-000000000102',
    'Trip completed',
    'Your last trip was completed. Earnings have been updated.',
    'read'
  ),
  -- Passenger-facing (passenger A user ...101).
  (
    '00000000-0000-0000-0000-000000000903',
    '00000000-0000-0000-0000-000000000101',
    'Welcome back',
    'Ready for your next ride? Request one to start pooling.',
    'unread'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO weather_events (id, event_type, severity, location_label, observed_at)
VALUES
  ('00000000-0000-0000-0000-000000000501', 'rain', 'moderate', 'Phường Bình Thạnh, Thành phố Hồ Chí Minh', NOW())
ON CONFLICT (id) DO NOTHING;
