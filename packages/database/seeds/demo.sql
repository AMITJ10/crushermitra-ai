insert into subscription_plans (id, code, name, limits, features)
values
  ('10000000-0000-4000-8000-000000000001', 'basic', 'Basic', '{"plants":1,"users":5,"monthly_weighments":1000}', '{"ai":false}'),
  ('10000000-0000-4000-8000-000000000002', 'operations', 'Operations', '{"plants":3,"users":25,"monthly_weighments":10000}', '{"ai":true}'),
  ('10000000-0000-4000-8000-000000000003', 'professional', 'Professional', '{"plants":10,"users":100,"monthly_weighments":50000}', '{"ai":true,"integrations":true}'),
  ('10000000-0000-4000-8000-000000000004', 'enterprise', 'Enterprise', '{"plants":999,"users":9999,"monthly_weighments":999999}', '{"ai":true,"integrations":true,"custom":true}')
on conflict (code) do update set
  name = excluded.name,
  limits = excluded.limits,
  features = excluded.features;

insert into permissions (code, description)
values
  ('organisation.manage', 'Manage organisation settings'),
  ('master_data.view', 'View master data'),
  ('plant.create', 'Create plants'),
  ('plant.update', 'Update plants'),
  ('user.invite', 'Invite users'),
  ('customer.create', 'Create customers'),
  ('customer.update', 'Update customers'),
  ('supplier.create', 'Create suppliers'),
  ('supplier.update', 'Update suppliers'),
  ('product.create', 'Create products'),
  ('product.update', 'Update products'),
  ('vehicle.create', 'Create vehicles'),
  ('vehicle.update', 'Update vehicles'),
  ('driver.create', 'Create drivers'),
  ('driver.update', 'Update drivers'),
  ('machine.create', 'Create machines'),
  ('machine.update', 'Update machines'),
  ('storage_location.create', 'Create storage locations'),
  ('storage_location.update', 'Update storage locations'),
  ('pricing.view', 'View pricing'),
  ('pricing.change', 'Change pricing'),
  ('order.create', 'Create orders'),
  ('order.approve', 'Approve orders'),
  ('weighment.create', 'Create weighments'),
  ('weighment.correct', 'Correct weighments'),
  ('weighment.approve', 'Approve weighments'),
  ('dispatch.create', 'Create dispatches'),
  ('dispatch.complete', 'Complete dispatches'),
  ('inventory.view', 'View inventory'),
  ('inventory.adjust', 'Adjust inventory'),
  ('production.record', 'Record production'),
  ('production.approve', 'Approve production'),
  ('invoice.create', 'Create invoices'),
  ('payment.record', 'Record payments'),
  ('payment.approve', 'Approve payments'),
  ('quality.create', 'Create quality records'),
  ('quality.approve', 'Approve quality records'),
  ('maintenance.create', 'Create maintenance records'),
  ('maintenance.close', 'Close maintenance records'),
  ('compliance.view', 'View compliance'),
  ('compliance.manage', 'Manage compliance'),
  ('report.export', 'Export reports'),
  ('ai.use', 'Use AI assistant'),
  ('audit.view', 'View audit logs')
on conflict (code) do update set description = excluded.description;

insert into organisations (
  id,
  legal_name,
  trade_name,
  organisation_type,
  pan,
  gstin,
  phone,
  email,
  state,
  district,
  pincode
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Shivneri Aggregates and Concrete Pvt. Ltd.',
  'Shivneri Aggregates',
  'crusher_plus_rmc',
  'ABCDE1234F',
  '27ABCDE1234F1Z5',
  '9876543210',
  'owner@shivneri.example',
  'Maharashtra',
  'Pune',
  '411001'
)
on conflict (id) do update set
  legal_name = excluded.legal_name,
  trade_name = excluded.trade_name,
  updated_at = now();

insert into organisation_settings (organisation_id, allow_negative_stock, default_time_zone, default_locale)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false, 'Asia/Kolkata', 'en')
on conflict (organisation_id) do update set
  allow_negative_stock = excluded.allow_negative_stock,
  default_time_zone = excluded.default_time_zone,
  default_locale = excluded.default_locale,
  updated_at = now();

insert into subscriptions (id, organisation_id, plan_id, status, trial_ends_at)
values (
  '10000000-0000-4000-8000-000000000101',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '10000000-0000-4000-8000-000000000003',
  'trial',
  now() + interval '30 days'
)
on conflict (id) do nothing;

insert into plants (id, organisation_id, name, code, plant_type, address, capacity, contact_person)
values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Pune Crusher Plant', 'PUNE-CRUSHER', 'stone_crusher', 'Fictional Industrial Area, Pune', '350 TPH', 'Demo Manager'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Pune RMC Plant', 'PUNE-RMC', 'rmc', 'Fictional RMC Yard, Pune', '60 m3/hour', 'Demo Batching Lead'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Nashik Crusher and RMC Plant', 'NASHIK-COMBINED', 'crusher_plus_rmc', 'Fictional Quarry Road, Nashik', '250 TPH and 45 m3/hour', 'Demo Plant Head')
on conflict (organisation_id, code) do update set
  name = excluded.name,
  plant_type = excluded.plant_type,
  updated_at = now();

insert into plant_settings (plant_id, organisation_id)
values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
on conflict (plant_id) do nothing;

insert into users (id, name, email, mobile, password_hash)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Demo Owner',
    'owner@shivneri.example',
    '9876543210',
    'pbkdf2_sha256$310000$demo_phase1_owner_salt_2026$RAQ7dQm2GKzlLKjQfb276f4Gs9YvlPnqg1XqyEu46z8'
  ),
  (
    '11111111-1111-4111-8111-111111111112',
    'Inventory Adjuster',
    'inventory-adjuster@shivneri.example',
    '9876543211',
    'pbkdf2_sha256$310000$demo_phase1_owner_salt_2026$RAQ7dQm2GKzlLKjQfb276f4Gs9YvlPnqg1XqyEu46z8'
  ),
  (
    '11111111-1111-4111-8111-111111111113',
    'Inventory Viewer',
    'inventory-viewer@shivneri.example',
    '9876543212',
    'pbkdf2_sha256$310000$demo_phase1_owner_salt_2026$RAQ7dQm2GKzlLKjQfb276f4Gs9YvlPnqg1XqyEu46z8'
  )
on conflict (email) do update set
  name = excluded.name,
  mobile = excluded.mobile,
  password_hash = excluded.password_hash,
  updated_at = now();

insert into memberships (id, organisation_id, user_id, status)
values
  (
    '22222222-2222-4222-8222-222222222222',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'active'
  ),
  (
    '22222222-2222-4222-8222-222222222223',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111112',
    'active'
  ),
  (
    '22222222-2222-4222-8222-222222222224',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111113',
    'active'
  )
on conflict (organisation_id, user_id) do update set status = excluded.status;

insert into roles (id, organisation_id, code, name, is_system_role)
values
  ('33333333-3333-4333-8333-333333333331', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'organisation_owner', 'Organisation Owner', true),
  ('33333333-3333-4333-8333-333333333332', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'plant_manager', 'Plant Manager', true),
  ('33333333-3333-4333-8333-333333333333', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'weighbridge_operator', 'Weighbridge Operator', true),
  ('33333333-3333-4333-8333-333333333334', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'accountant', 'Accountant', true),
  ('33333333-3333-4333-8333-333333333335', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'read_only_auditor', 'Read-Only Auditor', true),
  ('33333333-3333-4333-8333-333333333336', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'inventory_adjuster', 'Inventory Adjuster', true)
on conflict (organisation_id, code) do update set
  name = excluded.name,
  is_system_role = excluded.is_system_role;

insert into role_permissions (role_id, permission_code)
select '33333333-3333-4333-8333-333333333331'::uuid, code from permissions
on conflict do nothing;

insert into role_permissions (role_id, permission_code)
values
  ('33333333-3333-4333-8333-333333333332', 'plant.update'),
  ('33333333-3333-4333-8333-333333333332', 'master_data.view'),
  ('33333333-3333-4333-8333-333333333332', 'customer.create'),
  ('33333333-3333-4333-8333-333333333332', 'customer.update'),
  ('33333333-3333-4333-8333-333333333332', 'supplier.create'),
  ('33333333-3333-4333-8333-333333333332', 'supplier.update'),
  ('33333333-3333-4333-8333-333333333332', 'product.create'),
  ('33333333-3333-4333-8333-333333333332', 'product.update'),
  ('33333333-3333-4333-8333-333333333332', 'vehicle.create'),
  ('33333333-3333-4333-8333-333333333332', 'vehicle.update'),
  ('33333333-3333-4333-8333-333333333332', 'driver.create'),
  ('33333333-3333-4333-8333-333333333332', 'driver.update'),
  ('33333333-3333-4333-8333-333333333332', 'machine.create'),
  ('33333333-3333-4333-8333-333333333332', 'machine.update'),
  ('33333333-3333-4333-8333-333333333332', 'storage_location.create'),
  ('33333333-3333-4333-8333-333333333332', 'storage_location.update'),
  ('33333333-3333-4333-8333-333333333332', 'order.create'),
  ('33333333-3333-4333-8333-333333333332', 'order.approve'),
  ('33333333-3333-4333-8333-333333333332', 'weighment.create'),
  ('33333333-3333-4333-8333-333333333332', 'dispatch.create'),
  ('33333333-3333-4333-8333-333333333332', 'inventory.view'),
  ('33333333-3333-4333-8333-333333333332', 'production.record'),
  ('33333333-3333-4333-8333-333333333332', 'production.approve'),
  ('33333333-3333-4333-8333-333333333333', 'weighment.create'),
  ('33333333-3333-4333-8333-333333333333', 'dispatch.create'),
  ('33333333-3333-4333-8333-333333333333', 'inventory.view'),
  ('33333333-3333-4333-8333-333333333334', 'pricing.view'),
  ('33333333-3333-4333-8333-333333333334', 'invoice.create'),
  ('33333333-3333-4333-8333-333333333334', 'payment.record'),
  ('33333333-3333-4333-8333-333333333334', 'payment.approve'),
  ('33333333-3333-4333-8333-333333333335', 'inventory.view'),
  ('33333333-3333-4333-8333-333333333335', 'master_data.view'),
  ('33333333-3333-4333-8333-333333333335', 'pricing.view'),
  ('33333333-3333-4333-8333-333333333335', 'compliance.view'),
  ('33333333-3333-4333-8333-333333333335', 'audit.view'),
  ('33333333-3333-4333-8333-333333333336', 'master_data.view'),
  ('33333333-3333-4333-8333-333333333336', 'inventory.view'),
  ('33333333-3333-4333-8333-333333333336', 'inventory.adjust'),
  ('33333333-3333-4333-8333-333333333336', 'report.export'),
  ('33333333-3333-4333-8333-333333333336', 'audit.view')
on conflict do nothing;

insert into membership_roles (membership_id, role_id)
values
  (
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333331'
  ),
  (
    '22222222-2222-4222-8222-222222222223',
    '33333333-3333-4333-8333-333333333336'
  ),
  (
    '22222222-2222-4222-8222-222222222224',
    '33333333-3333-4333-8333-333333333335'
  )
on conflict do nothing;

insert into user_plant_access (membership_id, plant_id)
values
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'),
  ('22222222-2222-4222-8222-222222222223', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'),
  ('22222222-2222-4222-8222-222222222224', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')
on conflict do nothing;

insert into products (id, organisation_id, code, name, category, base_unit, purchase_unit, sales_unit, gst_rate)
values
  ('44444444-4444-4444-8444-444444444441', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'RAW-BASALT', 'Raw basalt stone', 'raw_stone', 'tonne', 'tonne', 'tonne', 5.00),
  ('44444444-4444-4444-8444-444444444442', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'AGG-40MM', '40 mm aggregate', 'crusher_output', 'tonne', 'tonne', 'tonne', 5.00),
  ('44444444-4444-4444-8444-444444444443', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'AGG-20MM', '20 mm aggregate', 'crusher_output', 'tonne', 'tonne', 'tonne', 5.00),
  ('44444444-4444-4444-8444-444444444444', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'M-SAND', 'M-sand', 'crusher_output', 'tonne', 'tonne', 'brass', 5.00),
  ('44444444-4444-4444-8444-444444444445', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'CEMENT', 'Cement', 'rmc_raw_material', 'kilogram', 'tonne', 'kilogram', 28.00),
  ('44444444-4444-4444-8444-444444444446', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'M25-CONCRETE', 'M25 concrete', 'finished_concrete', 'cubic_metre', 'cubic_metre', 'cubic_metre', 18.00)
on conflict (organisation_id, code) do update set
  name = excluded.name,
  category = excluded.category,
  gst_rate = excluded.gst_rate,
  updated_at = now();

insert into product_unit_conversions (organisation_id, product_id, from_unit, to_unit, factor)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '44444444-4444-4444-8444-444444444444',
  'brass',
  'tonne',
  4.50
)
on conflict (organisation_id, product_id, from_unit, to_unit) do update set factor = excluded.factor;

insert into storage_locations (id, organisation_id, plant_id, code, name, location_type)
values
  ('55555555-5555-4555-8555-555555555551', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'RAW-STOCKPILE', 'Raw stone stockpile', 'stockpile'),
  ('55555555-5555-4555-8555-555555555552', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'FINISHED-YARD', 'Finished aggregate yard', 'stockpile'),
  ('55555555-5555-4555-8555-555555555553', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'RMC-BINS', 'RMC aggregate bins', 'bin')
on conflict (organisation_id, plant_id, code) do update set name = excluded.name;

insert into audit_logs (
  id,
  organisation_id,
  plant_id,
  actor_user_id,
  event_type,
  entity_type,
  entity_id,
  new_value,
  reason,
  request_id
)
values (
  '66666666-6666-4666-8666-666666666661',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  '11111111-1111-4111-8111-111111111111',
  'seed.created',
  'organisation',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '{"source":"demo seed"}',
  'Initial fictional Phase 1 seed data',
  'seed_phase_1'
)
on conflict (id) do nothing;

insert into customers (
  id,
  organisation_id,
  code,
  customer_type,
  legal_name,
  trade_name,
  contact_person,
  phone,
  whatsapp_number,
  email,
  gstin,
  pan,
  billing_address,
  state,
  district,
  pincode,
  credit_limit,
  credit_days,
  active,
  notes,
  created_by_user_id
)
values
  ('77777777-7777-4777-8777-777777777771', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'CUST-WAG-001', 'builder', 'Wagholi Heights Projects Pvt. Ltd.', 'Wagholi Heights', 'Anil Demo', '9876500001', '9876500001', 'accounts@wagholi.example', '27ABCDE1234F1Z5', 'ABCDE1234F', 'Fictional Site Office, Wagholi', 'Maharashtra', 'Pune', '412207', 2500000, 30, true, 'Fictional demo customer', '11111111-1111-4111-8111-111111111111'),
  ('77777777-7777-4777-8777-777777777772', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'CUST-HIN-002', 'contractor', 'Hinjewadi Infra Works LLP', 'Hinjewadi Infra', 'Meera Demo', '9876500002', '9876500002', 'billing@hinjewadi.example', '27ABCDE1234F1Z6', 'ABCDE1234G', 'Fictional Phase 2 Road, Hinjewadi', 'Maharashtra', 'Pune', '411057', 1800000, 21, true, 'Fictional demo customer', '11111111-1111-4111-8111-111111111111')
on conflict (organisation_id, code) do update set
  legal_name = excluded.legal_name,
  trade_name = excluded.trade_name,
  updated_at = now();

insert into customer_sites (
  id,
  organisation_id,
  customer_id,
  site_code,
  site_name,
  contact_person,
  phone,
  address,
  state,
  district,
  pincode,
  latitude,
  longitude,
  location,
  active,
  created_by_user_id
)
values
  ('88888888-8888-4888-8888-888888888881', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '77777777-7777-4777-8777-777777777771', 'WAG-A', 'Wagholi Tower A', 'Anil Demo', '9876500001', 'Fictional Tower A Site, Wagholi', 'Maharashtra', 'Pune', '412207', 18.5800, 73.9890, st_setsrid(st_makepoint(73.9890, 18.5800), 4326), true, '11111111-1111-4111-8111-111111111111'),
  ('88888888-8888-4888-8888-888888888882', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '77777777-7777-4777-8777-777777777772', 'HIN-RD', 'Hinjewadi Road Package', 'Meera Demo', '9876500002', 'Fictional Road Work, Hinjewadi', 'Maharashtra', 'Pune', '411057', 18.5910, 73.7380, st_setsrid(st_makepoint(73.7380, 18.5910), 4326), true, '11111111-1111-4111-8111-111111111111')
on conflict (organisation_id, customer_id, site_code) do update set
  site_name = excluded.site_name,
  updated_at = now();

insert into suppliers (
  id,
  organisation_id,
  code,
  supplier_type,
  legal_name,
  trade_name,
  contact_person,
  phone,
  email,
  gstin,
  pan,
  address,
  state,
  district,
  pincode,
  credit_days,
  active,
  created_by_user_id
)
values
  ('99999999-9999-4999-8999-999999999991', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'SUP-BAS-001', 'raw_stone', 'Demo Basalt Quarry LLP', 'Demo Basalt Quarry', 'Ravi Demo', '9876500011', 'quarry@example.test', '27ABCDE1234F1Z7', 'ABCDE1234H', 'Fictional Quarry Road, Pune District', 'Maharashtra', 'Pune', '412205', 15, true, '11111111-1111-4111-8111-111111111111'),
  ('99999999-9999-4999-8999-999999999992', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'SUP-CEM-002', 'cement', 'Demo Cement Traders Pvt. Ltd.', 'Demo Cement Traders', 'Sonal Demo', '9876500012', 'cement@example.test', '27ABCDE1234F1Z8', 'ABCDE1234J', 'Fictional Market Yard, Pune', 'Maharashtra', 'Pune', '411037', 30, true, '11111111-1111-4111-8111-111111111111')
on conflict (organisation_id, code) do update set
  legal_name = excluded.legal_name,
  updated_at = now();

insert into product_prices (
  organisation_id,
  product_id,
  price_type,
  unit,
  rate,
  effective_from,
  active,
  created_by_user_id
)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '44444444-4444-4444-8444-444444444443', 'sale', 'tonne', 760.00, '2026-04-01', true, '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '44444444-4444-4444-8444-444444444445', 'purchase', 'tonne', 6200.00, '2026-04-01', true, '11111111-1111-4111-8111-111111111111')
on conflict (organisation_id, product_id, price_type, unit, effective_from) do update set
  rate = excluded.rate,
  updated_at = now();

insert into vehicles (
  id,
  organisation_id,
  registration_number,
  vehicle_type,
  owner_type,
  owner_name,
  capacity_tonne,
  capacity_cubic_metre,
  active,
  created_by_user_id
)
values
  ('aaaaaaaa-bbbb-4ccc-8ddd-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'MH12AB1234', 'tipper', 'owned', 'Shivneri Aggregates', 18.00, null, true, '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-bbbb-4ccc-8ddd-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'MH14CD5678', 'transit_mixer', 'owned', 'Shivneri Aggregates', null, 6.00, true, '11111111-1111-4111-8111-111111111111')
on conflict (organisation_id, registration_number) do update set
  vehicle_type = excluded.vehicle_type,
  updated_at = now();

insert into drivers (
  id,
  organisation_id,
  code,
  name,
  phone,
  licence_number,
  licence_expiry,
  active,
  created_by_user_id
)
values
  ('aaaaaaaa-bbbb-4ccc-8ddd-000000000011', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'DRV-001', 'Suresh Demo', '9876500021', 'MH-DEMO-DRV-001', '2028-03-31', true, '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-bbbb-4ccc-8ddd-000000000012', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'DRV-002', 'Nilesh Demo', '9876500022', 'MH-DEMO-DRV-002', '2029-06-30', true, '11111111-1111-4111-8111-111111111111')
on conflict (organisation_id, code) do update set
  name = excluded.name,
  updated_at = now();

insert into machines (
  id,
  organisation_id,
  plant_id,
  code,
  name,
  machine_type,
  make,
  model,
  serial_number,
  active,
  created_by_user_id
)
values
  ('aaaaaaaa-bbbb-4ccc-8ddd-000000000021', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'CR-PRIMARY-01', 'Primary Jaw Crusher', 'crusher', 'DemoMake', 'J-250', 'SER-DEMO-001', true, '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-bbbb-4ccc-8ddd-000000000022', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'RMC-BATCH-01', 'RMC Batching Plant', 'batching_plant', 'DemoBatch', 'B-60', 'SER-DEMO-002', true, '11111111-1111-4111-8111-111111111111')
on conflict (organisation_id, plant_id, code) do update set
  name = excluded.name,
  updated_at = now();

insert into shifts (
  id,
  organisation_id,
  plant_id,
  code,
  name,
  start_time,
  end_time,
  crosses_midnight,
  break_duration_minutes,
  active_days,
  active,
  created_by_user_id,
  updated_by_user_id
)
values
  ('aaaaaaaa-bbbb-4ccc-8ddd-000000000031', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'SHIFT-A', 'Shift A', '06:00', '14:00', false, 30, array['mon','tue','wed','thu','fri','sat'], true, '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-bbbb-4ccc-8ddd-000000000032', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'SHIFT-B', 'Shift B', '14:00', '22:00', false, 30, array['mon','tue','wed','thu','fri','sat'], true, '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-bbbb-4ccc-8ddd-000000000033', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'SHIFT-C', 'Shift C', '22:00', '06:00', true, 30, array['mon','tue','wed','thu','fri','sat'], true, '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111')
on conflict do nothing;

insert into customer_orders (
  id,
  organisation_id,
  plant_id,
  customer_id,
  customer_site_id,
  product_id,
  order_number,
  order_date,
  expected_dispatch_date,
  quantity,
  unit,
  rate,
  total_amount,
  status,
  notes,
  created_by_user_id,
  updated_by_user_id
)
values (
  'f1000000-0000-4000-9000-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  '77777777-7777-4777-8777-777777777771',
  '88888888-8888-4888-8888-888888888881',
  '44444444-4444-4444-8444-444444444444',
  'ORD-SEED-001',
  current_date,
  current_date + interval '1 day',
  120,
  'tonne',
  850,
  102000,
  'approved',
  'Seeded workflow order based on master data.',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111'
)
on conflict (organisation_id, plant_id, order_number) do update set
  quantity = excluded.quantity,
  rate = excluded.rate,
  total_amount = excluded.total_amount,
  status = excluded.status,
  updated_at = now();

insert into stock_reservations (
  organisation_id,
  plant_id,
  storage_location_id,
  source_order_id,
  product_id,
  quantity_base_unit,
  unit,
  conversion_factor,
  status,
  created_by_user_id,
  updated_by_user_id
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  '55555555-5555-4555-8555-555555555552',
  'f1000000-0000-4000-9000-000000000001',
  '44444444-4444-4444-8444-444444444444',
  120,
  'tonne',
  1,
  'reserved',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111'
)
on conflict (organisation_id, plant_id, source_order_id, product_id, storage_location_id) do update set
  quantity_base_unit = excluded.quantity_base_unit,
  unit = excluded.unit,
  conversion_factor = excluded.conversion_factor,
  status = excluded.status,
  released_at = null,
  updated_at = now();

insert into dispatch_records (
  id,
  organisation_id,
  plant_id,
  order_id,
  customer_id,
  customer_site_id,
  vehicle_id,
  driver_id,
  product_id,
  source_storage_location_id,
  dispatch_number,
  dispatch_date,
  quantity,
  unit,
  first_weight,
  second_weight,
  net_weight,
  status,
  delivery_challan_number,
  notes,
  created_by_user_id,
  updated_by_user_id
)
values (
  'f2000000-0000-4000-9000-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'f1000000-0000-4000-9000-000000000001',
  '77777777-7777-4777-8777-777777777771',
  '88888888-8888-4888-8888-888888888881',
  'aaaaaaaa-bbbb-4ccc-8ddd-000000000001',
  'aaaaaaaa-bbbb-4ccc-8ddd-000000000011',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555552',
  'DSP-SEED-001',
  current_date,
  30,
  'tonne',
  11250,
  41500,
  30250,
  'dispatched',
  'DC-SEED-001',
  'Seeded dispatch record based on master data.',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111'
)
on conflict (organisation_id, plant_id, dispatch_number) do update set
  quantity = excluded.quantity,
  source_storage_location_id = excluded.source_storage_location_id,
  net_weight = excluded.net_weight,
  status = excluded.status,
  updated_at = now();

insert into operation_records (
  id,
  organisation_id,
  plant_id,
  operation_number,
  operation_type,
  product_id,
  machine_id,
  operation_date,
  quantity,
  unit,
  status,
  notes,
  created_by_user_id,
  updated_by_user_id
)
values
  (
    'f3000000-0000-4000-9000-000000000001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'OPS-SEED-001',
    'crusher_shift_run',
    '44444444-4444-4444-8444-444444444444',
    'aaaaaaaa-bbbb-4ccc-8ddd-000000000021',
    current_date,
    80,
    'tonne',
    'completed',
    'Seeded crusher production record.',
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'f3000000-0000-4000-9000-000000000002',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'OPS-SEED-002',
    'rmc_batch',
    '44444444-4444-4444-8444-444444444446',
    'aaaaaaaa-bbbb-4ccc-8ddd-000000000022',
    current_date,
    24,
    'm3',
    'completed',
    'Seeded RMC batch record.',
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111'
  )
on conflict (organisation_id, plant_id, operation_number) do update set
  quantity = excluded.quantity,
  status = excluded.status,
  updated_at = now();

insert into billing_records (
  id,
  organisation_id,
  plant_id,
  customer_id,
  invoice_number,
  billing_date,
  due_date,
  amount,
  status,
  notes,
  created_by_user_id,
  updated_by_user_id
)
values (
  'f4000000-0000-4000-9000-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  '77777777-7777-4777-8777-777777777771',
  'INV-SEED-001',
  current_date,
  current_date + interval '21 days',
  102000,
  'sent',
  'Seeded billing record.',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111'
)
on conflict (organisation_id, plant_id, invoice_number) do update set
  amount = excluded.amount,
  status = excluded.status,
  updated_at = now();

insert into ai_safety_events (
  organisation_id,
  plant_id,
  event_type,
  severity,
  message,
  source_type,
  source_id,
  created_by_user_id
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'advisory',
  'info',
  'AI recommendations are advisory and require human confirmation for write actions.',
  'system',
  null,
  '11111111-1111-4111-8111-111111111111'
);

insert into purchase_receipts (
  id,
  organisation_id,
  plant_id,
  supplier_id,
  storage_location_id,
  product_id,
  receipt_number,
  receipt_date,
  source_document_number,
  quantity,
  unit,
  conversion_factor,
  quantity_base_unit,
  unit_cost,
  total_cost,
  status,
  notes,
  created_by_user_id,
  updated_by_user_id
)
values
  (
    'f5000000-0000-4000-9000-000000000001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    '99999999-9999-4999-8999-999999999991',
    '55555555-5555-4555-8555-555555555551',
    '44444444-4444-4444-8444-444444444441',
    'PRC-SEED-001',
    current_date,
    'SUP-SEED-BASALT-001',
    600,
    'tonne',
    1,
    600,
    320,
    192000,
    'posted',
    'Seeded raw stone receipt for ledger verification.',
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'f5000000-0000-4000-9000-000000000002',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    '99999999-9999-4999-8999-999999999992',
    '55555555-5555-4555-8555-555555555553',
    '44444444-4444-4444-8444-444444444445',
    'PRC-SEED-002',
    current_date,
    'SUP-SEED-CEMENT-001',
    20,
    'tonne',
    1000,
    20000,
    6.2,
    124000,
    'posted',
    'Seeded cement receipt for RMC stock.',
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111'
  )
on conflict (organisation_id, plant_id, receipt_number) do update set
  quantity = excluded.quantity,
  quantity_base_unit = excluded.quantity_base_unit,
  total_cost = excluded.total_cost,
  status = excluded.status,
  updated_at = now();

insert into production_runs (
  id,
  organisation_id,
  plant_id,
  machine_id,
  run_number,
  run_type,
  production_date,
  status,
  notes,
  created_by_user_id,
  updated_by_user_id
)
values (
  'f6000000-0000-4000-9000-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'aaaaaaaa-bbbb-4ccc-8ddd-000000000021',
  'CRP-SEED-001',
  'crusher',
  current_date,
  'completed',
  'Seeded crusher production ledger run.',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111'
)
on conflict (organisation_id, plant_id, run_number) do update set
  status = excluded.status,
  updated_at = now();

insert into production_run_inputs (
  id,
  organisation_id,
  plant_id,
  production_run_id,
  storage_location_id,
  product_id,
  quantity,
  unit,
  conversion_factor,
  quantity_base_unit
)
values (
  'f6100000-0000-4000-9000-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'f6000000-0000-4000-9000-000000000001',
  '55555555-5555-4555-8555-555555555551',
  '44444444-4444-4444-8444-444444444441',
  120,
  'tonne',
  1,
  120
)
on conflict (id) do nothing;

insert into production_run_outputs (
  id,
  organisation_id,
  plant_id,
  production_run_id,
  storage_location_id,
  product_id,
  quantity,
  unit,
  conversion_factor,
  quantity_base_unit
)
values
  (
    'f6200000-0000-4000-9000-000000000001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'f6000000-0000-4000-9000-000000000001',
    '55555555-5555-4555-8555-555555555552',
    '44444444-4444-4444-8444-444444444444',
    80,
    'tonne',
    1,
    80
  ),
  (
    'f6200000-0000-4000-9000-000000000002',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'f6000000-0000-4000-9000-000000000001',
    '55555555-5555-4555-8555-555555555552',
    '44444444-4444-4444-8444-444444444443',
    40,
    'tonne',
    1,
    40
  )
on conflict (id) do nothing;

insert into inventory_transactions (
  id,
  organisation_id,
  plant_id,
  storage_location_id,
  product_id,
  transaction_type,
  source_type,
  source_id,
  direction,
  quantity_base_unit,
  unit,
  conversion_factor,
  unit_cost,
  total_cost,
  approval_status,
  reason,
  idempotency_key,
  occurred_at,
  created_by_user_id
)
values
  ('f7000000-0000-4000-9000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '55555555-5555-4555-8555-555555555551', '44444444-4444-4444-8444-444444444441', 'purchase_receipt', 'purchase_receipt', 'f5000000-0000-4000-9000-000000000001', 'in', 600, 'tonne', 1, 320, 192000, 'approved', 'Seeded raw stone receipt.', 'seed:inventory:raw-receipt', current_date, '11111111-1111-4111-8111-111111111111'),
  ('f7000000-0000-4000-9000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '55555555-5555-4555-8555-555555555553', '44444444-4444-4444-8444-444444444445', 'purchase_receipt', 'purchase_receipt', 'f5000000-0000-4000-9000-000000000002', 'in', 20000, 'tonne', 1000, 6.2, 124000, 'approved', 'Seeded cement receipt.', 'seed:inventory:cement-receipt', current_date, '11111111-1111-4111-8111-111111111111'),
  ('f7000000-0000-4000-9000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '55555555-5555-4555-8555-555555555551', '44444444-4444-4444-8444-444444444441', 'production_consumption', 'production_run_inputs', 'f6100000-0000-4000-9000-000000000001', 'out', 120, 'tonne', 1, null, null, 'approved', 'Seeded crusher production consumption.', 'seed:inventory:crusher-input', current_date, '11111111-1111-4111-8111-111111111111'),
  ('f7000000-0000-4000-9000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '55555555-5555-4555-8555-555555555552', '44444444-4444-4444-8444-444444444444', 'production_output', 'production_run_outputs', 'f6200000-0000-4000-9000-000000000001', 'in', 80, 'tonne', 1, null, null, 'approved', 'Seeded crusher production output.', 'seed:inventory:crusher-msand-output', current_date, '11111111-1111-4111-8111-111111111111'),
  ('f7000000-0000-4000-9000-000000000005', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '55555555-5555-4555-8555-555555555552', '44444444-4444-4444-8444-444444444443', 'production_output', 'production_run_outputs', 'f6200000-0000-4000-9000-000000000002', 'in', 40, 'tonne', 1, null, null, 'approved', 'Seeded 20 mm production output.', 'seed:inventory:crusher-20mm-output', current_date, '11111111-1111-4111-8111-111111111111'),
  ('f7000000-0000-4000-9000-000000000006', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '55555555-5555-4555-8555-555555555552', '44444444-4444-4444-8444-444444444444', 'dispatch_reduction', 'dispatch_record', 'f2000000-0000-4000-9000-000000000001', 'out', 30, 'tonne', 1, null, null, 'approved', 'Seeded dispatch stock reduction.', 'seed:inventory:dispatch-reduction', current_date, '11111111-1111-4111-8111-111111111111')
on conflict (organisation_id, idempotency_key) do nothing;

update purchase_receipts set inventory_transaction_id = 'f7000000-0000-4000-9000-000000000001'
where id = 'f5000000-0000-4000-9000-000000000001';
update purchase_receipts set inventory_transaction_id = 'f7000000-0000-4000-9000-000000000002'
where id = 'f5000000-0000-4000-9000-000000000002';
update production_run_inputs set inventory_transaction_id = 'f7000000-0000-4000-9000-000000000003'
where id = 'f6100000-0000-4000-9000-000000000001';
update production_run_outputs set inventory_transaction_id = 'f7000000-0000-4000-9000-000000000004'
where id = 'f6200000-0000-4000-9000-000000000001';
update production_run_outputs set inventory_transaction_id = 'f7000000-0000-4000-9000-000000000005'
where id = 'f6200000-0000-4000-9000-000000000002';
update dispatch_records set inventory_transaction_id = 'f7000000-0000-4000-9000-000000000006'
where id = 'f2000000-0000-4000-9000-000000000001';

insert into inventory_balances (
  organisation_id,
  plant_id,
  storage_location_id,
  product_id,
  quantity_base_unit
)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '55555555-5555-4555-8555-555555555551', '44444444-4444-4444-8444-444444444441', 480),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '55555555-5555-4555-8555-555555555552', '44444444-4444-4444-8444-444444444444', 50),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '55555555-5555-4555-8555-555555555552', '44444444-4444-4444-8444-444444444443', 40),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '55555555-5555-4555-8555-555555555553', '44444444-4444-4444-8444-444444444445', 20000)
on conflict (organisation_id, plant_id, storage_location_id, product_id) do update set
  quantity_base_unit = excluded.quantity_base_unit,
  updated_at = now();
