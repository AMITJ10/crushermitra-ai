create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  requested_ip inet,
  user_agent text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table organisations
  alter column pan drop not null;

create table if not exists platform_admins (
  user_id uuid primary key references users(id) on delete cascade,
  email text not null unique,
  role text not null default 'platform_admin' check (role = 'platform_admin'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists platform_admins_singleton
  on platform_admins ((role))
  where role = 'platform_admin';

create index if not exists idx_password_reset_tokens_user
  on password_reset_tokens (user_id, expires_at desc);

create index if not exists idx_password_reset_tokens_scope
  on password_reset_tokens (organisation_id, created_at desc);

alter table password_reset_tokens enable row level security;
alter table password_reset_tokens force row level security;

drop policy if exists tenant_isolation_password_reset_tokens on password_reset_tokens;
create policy tenant_isolation_password_reset_tokens on password_reset_tokens
  using (
    organisation_id is null
    or organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
  )
  with check (
    organisation_id is null
    or organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
  );

grant select, insert, update on password_reset_tokens to crushermitra_app;
grant select on platform_admins to crushermitra_app;
grant usage, select on all sequences in schema public to crushermitra_app;
