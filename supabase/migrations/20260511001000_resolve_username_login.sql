create or replace function public.resolve_username_auth_email(login_username text)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.users.email
  from public.profiles
  join auth.users on auth.users.id = profiles.id
  where profiles.username = lower(btrim(login_username))
  limit 1;
$$;

revoke all on function public.resolve_username_auth_email(text) from public;
grant execute on function public.resolve_username_auth_email(text) to anon, authenticated;
