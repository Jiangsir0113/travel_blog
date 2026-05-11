alter table public.profiles
  add column if not exists username text;

with normalized_profiles as (
  select
    profiles.id,
    case
      when lower(split_part(auth.users.email, '@', 1)) ~ '^[a-z0-9_]{3,24}$'
        then lower(split_part(auth.users.email, '@', 1))
      else 'user_' || left(replace(profiles.id::text, '-', ''), 8)
    end as base_username
  from public.profiles
  left join auth.users on auth.users.id = profiles.id
  where profiles.username is null
),
deduplicated_profiles as (
  select
    id,
    case
      when row_number() over (partition by base_username order by id) = 1 then base_username
      else left(base_username, 20) || '_' || row_number() over (partition by base_username order by id)::text
    end as next_username
  from normalized_profiles
)
update public.profiles
set username = deduplicated_profiles.next_username
from deduplicated_profiles
where public.profiles.id = deduplicated_profiles.id;

alter table public.profiles
  alter column username set not null;

alter table public.profiles
  drop constraint if exists profiles_username_format,
  add constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$');

create unique index if not exists profiles_username_key
  on public.profiles (username);

grant update (display_name, avatar_url, role, map_color) on public.profiles to authenticated;

drop function if exists public.create_profile_with_invite(text, text, text);

create or replace function public.create_profile_with_invite(
  invite_code text,
  display_name text,
  avatar_url text default null,
  username text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public, private
as $$
declare
  cleaned_display_name text := btrim(display_name);
  cleaned_username text := lower(btrim(username));
  granted_role text;
  new_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'PROFILE_ALREADY_EXISTS';
  end if;

  if cleaned_display_name is null
    or char_length(cleaned_display_name) < 1
    or char_length(cleaned_display_name) > 60 then
    raise exception 'DISPLAY_NAME_INVALID';
  end if;

  if cleaned_username is null
    or cleaned_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'USERNAME_INVALID';
  end if;

  if exists (select 1 from public.profiles where profiles.username = cleaned_username) then
    raise exception 'USERNAME_ALREADY_EXISTS';
  end if;

  select consumed.role_to_grant
  into granted_role
  from private.consume_invite_code(invite_code) as consumed;

  insert into public.profiles (id, username, display_name, avatar_url, role)
  values (auth.uid(), cleaned_username, cleaned_display_name, avatar_url, granted_role)
  returning * into new_profile;

  return new_profile;
end;
$$;

revoke all on function public.create_profile_with_invite(text, text, text, text) from public, anon;
grant execute on function public.create_profile_with_invite(text, text, text, text) to authenticated;
