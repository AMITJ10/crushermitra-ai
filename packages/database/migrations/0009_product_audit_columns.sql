alter table products add column if not exists created_by_user_id uuid references users(id);
alter table products add column if not exists updated_by_user_id uuid references users(id);

grant select, insert, update on all tables in schema public to crushermitra_app;
grant usage, select on all sequences in schema public to crushermitra_app;
