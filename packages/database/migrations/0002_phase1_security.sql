create table if not exists organisation_settings (
  organisation_id uuid primary key references organisations(id) on delete cascade,
  allow_negative_stock boolean not null default false,
  default_time_zone text not null default 'Asia/Kolkata',
  default_locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists plant_settings (
  plant_id uuid primary key references plants(id) on delete cascade,
  organisation_id uuid not null references organisations(id),
  weighment_variance_review_enabled boolean not null default true,
  crusher_material_variance_limit_percent numeric(5,2) not null default 3.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists login_history (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id),
  user_id uuid references users(id),
  email text not null,
  event_type text not null check (event_type in ('login', 'failed_login', 'logout')),
  failure_reason text,
  request_id text not null,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  user_id uuid not null references users(id),
  membership_id uuid not null references memberships(id),
  active_plant_id uuid references plants(id),
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_memberships_scope on memberships (organisation_id, user_id, status);
create index if not exists idx_roles_scope on roles (organisation_id, code);
create index if not exists idx_user_plant_access_plant on user_plant_access (plant_id);
create index if not exists idx_login_history_scope on login_history (organisation_id, user_id, created_at);
create index if not exists idx_sessions_scope on sessions (organisation_id, user_id, expires_at);
create index if not exists idx_plant_settings_scope on plant_settings (organisation_id, plant_id);

do $$
begin
  create role crushermitra_app nologin;
exception
  when duplicate_object then null;
end $$;

grant usage on schema public to crushermitra_app;
grant select, insert, update on all tables in schema public to crushermitra_app;
grant usage, select on all sequences in schema public to crushermitra_app;
alter default privileges in schema public grant select, insert, update on tables to crushermitra_app;
alter default privileges in schema public grant usage, select on sequences to crushermitra_app;

alter table subscriptions enable row level security;
alter table organisation_settings enable row level security;
alter table plant_settings enable row level security;
alter table users enable row level security;
alter table memberships enable row level security;
alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table membership_roles enable row level security;
alter table user_plant_access enable row level security;
alter table storage_locations enable row level security;
alter table inventory_balances enable row level security;
alter table weighbridges enable row level security;
alter table weighment_corrections enable row level security;
alter table ai_tool_calls enable row level security;
alter table knowledge_documents enable row level security;
alter table knowledge_chunks enable row level security;
alter table login_history enable row level security;
alter table sessions enable row level security;

alter table organisations force row level security;
alter table subscriptions force row level security;
alter table organisation_settings force row level security;
alter table plant_settings force row level security;
alter table plants force row level security;
alter table products force row level security;
alter table users force row level security;
alter table memberships force row level security;
alter table roles force row level security;
alter table role_permissions force row level security;
alter table membership_roles force row level security;
alter table user_plant_access force row level security;
alter table storage_locations force row level security;
alter table inventory_transactions force row level security;
alter table inventory_balances force row level security;
alter table weighbridges force row level security;
alter table weighments force row level security;
alter table weighment_corrections force row level security;
alter table audit_logs force row level security;
alter table ai_conversations force row level security;
alter table ai_messages force row level security;
alter table ai_tool_calls force row level security;
alter table knowledge_documents force row level security;
alter table knowledge_chunks force row level security;
alter table devices force row level security;
alter table login_history force row level security;
alter table sessions force row level security;

drop policy if exists tenant_isolation_organisations on organisations;
create policy tenant_isolation_organisations on organisations
  using (id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_subscriptions on subscriptions;
create policy tenant_isolation_subscriptions on subscriptions
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_organisation_settings on organisation_settings;
create policy tenant_isolation_organisation_settings on organisation_settings
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_plant_settings on plant_settings;
create policy tenant_isolation_plant_settings on plant_settings
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_plants on plants;
create policy tenant_isolation_plants on plants
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_products on products;
create policy tenant_isolation_products on products
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_users on users;
create policy tenant_isolation_users on users
  using (
    id = nullif(current_setting('app.current_user_id', true), '')::uuid
    or exists (
      select 1 from memberships
      where memberships.user_id = users.id
        and memberships.organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    )
  );

drop policy if exists tenant_isolation_memberships on memberships;
create policy tenant_isolation_memberships on memberships
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_roles on roles;
create policy tenant_isolation_roles on roles
  using (
    organisation_id is null
    or organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
  )
  with check (
    organisation_id is null
    or organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
  );

drop policy if exists tenant_isolation_role_permissions on role_permissions;
create policy tenant_isolation_role_permissions on role_permissions
  using (
    exists (
      select 1 from roles
      where roles.id = role_permissions.role_id
        and (
          roles.organisation_id is null
          or roles.organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
        )
    )
  );

drop policy if exists tenant_isolation_membership_roles on membership_roles;
create policy tenant_isolation_membership_roles on membership_roles
  using (
    exists (
      select 1 from memberships
      where memberships.id = membership_roles.membership_id
        and memberships.organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    )
  );

drop policy if exists tenant_isolation_user_plant_access on user_plant_access;
create policy tenant_isolation_user_plant_access on user_plant_access
  using (
    exists (
      select 1 from memberships
      where memberships.id = user_plant_access.membership_id
        and memberships.organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    )
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_storage_locations on storage_locations;
create policy tenant_isolation_storage_locations on storage_locations
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_inventory_transactions on inventory_transactions;
create policy tenant_isolation_inventory_transactions on inventory_transactions
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_inventory_balances on inventory_balances;
create policy tenant_isolation_inventory_balances on inventory_balances
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_weighbridges on weighbridges;
create policy tenant_isolation_weighbridges on weighbridges
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_weighments on weighments;
create policy tenant_isolation_weighments on weighments
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_weighment_corrections on weighment_corrections;
create policy tenant_isolation_weighment_corrections on weighment_corrections
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_knowledge_documents on knowledge_documents;
create policy tenant_isolation_knowledge_documents on knowledge_documents
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_ai_conversations on ai_conversations;
create policy tenant_isolation_ai_conversations on ai_conversations
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_ai_messages on ai_messages;
create policy tenant_isolation_ai_messages on ai_messages
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_ai_tool_calls on ai_tool_calls;
create policy tenant_isolation_ai_tool_calls on ai_tool_calls
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_audit_logs on audit_logs;
create policy tenant_isolation_audit_logs on audit_logs
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_devices on devices;
create policy tenant_isolation_devices on devices
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and (
      plant_id is null
      or plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
    )
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and (
      plant_id is null
      or plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
    )
  );

drop policy if exists tenant_isolation_knowledge_chunks on knowledge_chunks;
create policy tenant_isolation_knowledge_chunks on knowledge_chunks
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_login_history on login_history;
create policy tenant_isolation_login_history on login_history
  using (
    organisation_id is null
    or organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
  )
  with check (
    organisation_id is null
    or organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
  );

drop policy if exists tenant_isolation_sessions on sessions;
create policy tenant_isolation_sessions on sessions
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
  );
