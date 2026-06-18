do $$
declare
  login_role name := current_user;
begin
  if login_role <> 'crushermitra_app'
     and exists (select 1 from pg_roles where rolname = 'crushermitra_app') then
    execute format('grant crushermitra_app to %I', login_role);
  end if;
end $$;
