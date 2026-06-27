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
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000102', 'SAMPLE-LICENSE-001', 'Sample Vehicle', 'inactive')
ON CONFLICT (license_number) DO NOTHING;

INSERT INTO ride_pool_groups (id, status, origin_area, destination_area)
VALUES
  ('00000000-0000-0000-0000-000000000401', 'draft', 'Sample Origin', 'Sample Destination'),
  ('00000000-0000-0000-0000-000000000402', 'pending', 'Phường Bến Nghé, Thành phố Hồ Chí Minh', 'Phường Bình Thạnh, Thành phố Hồ Chí Minh')
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
  (
    '00000000-0000-0000-0000-000000000601',
    '00000000-0000-0000-0000-000000000201',
    '01 Công xã Paris, Phường Sài Gòn, Thành phố Hồ Chí Minh',
    '720A Điện Biên Phủ, Phường Bình Thạnh, Thành phố Hồ Chí Minh',
    10.779783,
    106.699018,
    10.801421,
    106.714710,
    'matching',
    NOW() - INTERVAL '10 minutes',
    52000.00
  ),
  (
    '00000000-0000-0000-0000-000000000602',
    '00000000-0000-0000-0000-000000000202',
    '22 Lê Duẩn, Phường Sài Gòn, Thành phố Hồ Chí Minh',
    '2 Nguyễn Hữu Cảnh, Phường Bình Thạnh, Thành phố Hồ Chí Minh',
    10.781761,
    106.701623,
    10.790457,
    106.718821,
    'matching',
    NOW() - INTERVAL '8 minutes',
    47000.00
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO ride_pool_members (id, ride_pool_group_id, booking_id, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000701',
    '00000000-0000-0000-0000-000000000402',
    '00000000-0000-0000-0000-000000000601',
    'pending'
  ),
  (
    '00000000-0000-0000-0000-000000000702',
    '00000000-0000-0000-0000-000000000402',
    '00000000-0000-0000-0000-000000000602',
    'pending'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO weather_events (id, event_type, severity, location_label, observed_at)
VALUES
  ('00000000-0000-0000-0000-000000000501', 'sample', 'low', 'Sample Location', NOW())
ON CONFLICT (id) DO NOTHING;
