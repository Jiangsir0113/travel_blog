create schema if not exists private;

grant usage on schema private to anon, authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function private.can_write_content()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'author')
  );
$$;

create or replace function private.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function private.current_profile_map_color()
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select map_color
  from public.profiles
  where id = auth.uid();
$$;

create or replace function private.consume_invite_code(invite_code text)
returns table (role_to_grant text)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  matched public.invite_codes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into matched
  from public.invite_codes
  where code = invite_code
    and is_active = true
    and used_count < max_uses
    and (expires_at is null or expires_at > now())
  for update;

  if not found then
    raise exception 'INVITE_CODE_INVALID';
  end if;

  update public.invite_codes
  set
    used_count = used_count + 1,
    is_active = case when used_count + 1 >= max_uses then false else is_active end
  where id = matched.id;

  role_to_grant := matched.role_to_grant;
  return next;
end;
$$;

create or replace function public.create_profile_with_invite(
  invite_code text,
  display_name text,
  avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public, private
as $$
declare
  cleaned_display_name text := btrim(display_name);
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

  select consumed.role_to_grant
  into granted_role
  from private.consume_invite_code(invite_code) as consumed;

  insert into public.profiles (id, display_name, avatar_url, role)
  values (auth.uid(), cleaned_display_name, avatar_url, granted_role)
  returning * into new_profile;

  return new_profile;
end;
$$;

grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.can_write_content() to anon, authenticated;
grant execute on function private.current_profile_role() to authenticated;
grant execute on function private.current_profile_map_color() to authenticated;
grant execute on function private.consume_invite_code(text) to authenticated;

revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.can_write_content() from public, anon, authenticated;
revoke all on function public.current_profile_role() from public, anon, authenticated;
revoke all on function public.current_profile_map_color() from public, anon, authenticated;
revoke all on function public.consume_invite_code(text) from public, anon, authenticated;
revoke all on function public.create_profile_with_invite(text, text, text) from public, anon;
grant execute on function public.create_profile_with_invite(text, text, text) to authenticated;

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = private.current_profile_role()
  and map_color = private.current_profile_map_color()
);

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "invite admin all" on public.invite_codes;
create policy "invite admin all" on public.invite_codes for all to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "trips published and owner read" on public.trips;
create policy "trips published and owner read" on public.trips for select to anon, authenticated
using (status = 'published' or author_id = auth.uid() or private.is_admin());

drop policy if exists "trips author insert" on public.trips;
create policy "trips author insert" on public.trips for insert to authenticated
with check (private.can_write_content() and author_id = auth.uid());

drop policy if exists "trips author update" on public.trips;
create policy "trips author update" on public.trips for update to authenticated
using (private.can_write_content() and (author_id = auth.uid() or private.is_admin()))
with check (private.can_write_content() and (author_id = auth.uid() or private.is_admin()));

drop policy if exists "trips author delete" on public.trips;
create policy "trips author delete" on public.trips for delete to authenticated
using (private.can_write_content() and (author_id = auth.uid() or private.is_admin()));

drop policy if exists "assets published and owner read" on public.trip_assets;
create policy "assets published and owner read" on public.trip_assets for select to anon, authenticated using (
  exists (
    select 1
    from public.trips
    where trips.id = trip_assets.trip_id
      and (trips.status = 'published' or trips.author_id = auth.uid() or private.is_admin())
  )
);

drop policy if exists "assets owner insert" on public.trip_assets;
create policy "assets owner insert" on public.trip_assets for insert to authenticated with check (
  private.can_write_content()
  and (owner_id = auth.uid() or private.is_admin())
  and split_part(storage_path, '/', 1) = owner_id::text
  and split_part(storage_path, '/', 2) = trip_id::text
  and exists (
    select 1
    from public.trips
    where trips.id = trip_assets.trip_id
      and trips.author_id = trip_assets.owner_id
      and (trips.author_id = auth.uid() or private.is_admin())
  )
);

drop policy if exists "assets owner update" on public.trip_assets;
create policy "assets owner update" on public.trip_assets for update to authenticated
using (private.can_write_content() and (owner_id = auth.uid() or private.is_admin()))
with check (
  private.can_write_content()
  and (owner_id = auth.uid() or private.is_admin())
  and split_part(storage_path, '/', 1) = owner_id::text
  and split_part(storage_path, '/', 2) = trip_id::text
  and exists (
    select 1
    from public.trips
    where trips.id = trip_assets.trip_id
      and trips.author_id = trip_assets.owner_id
      and (trips.author_id = auth.uid() or private.is_admin())
  )
);

drop policy if exists "assets owner delete" on public.trip_assets;
create policy "assets owner delete" on public.trip_assets for delete to authenticated
using (private.can_write_content() and (owner_id = auth.uid() or private.is_admin()));

drop policy if exists "trip images scoped read" on storage.objects;
create policy "trip images scoped read" on storage.objects for select to anon, authenticated using (
  bucket_id = 'trip-images'
  and (
    (
      auth.uid() is not null
      and (
        (storage.foldername(name))[1] = auth.uid()::text
        or private.is_admin()
      )
    )
    or exists (
      select 1
      from public.trip_assets
      join public.trips on trips.id = trip_assets.trip_id
      where trip_assets.storage_path = storage.objects.name
        and trips.status = 'published'
    )
  )
);

drop policy if exists "trip images owner insert" on storage.objects;
create policy "trip images owner insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'trip-images'
  and private.can_write_content()
  and exists (
    select 1
    from public.trips
    where trips.id = case
      when (storage.foldername(storage.objects.name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (storage.foldername(storage.objects.name))[2]::uuid
      else null
    end
      and trips.author_id::text = (storage.foldername(storage.objects.name))[1]
      and (trips.author_id = auth.uid() or private.is_admin())
  )
);

drop policy if exists "trip images owner update" on storage.objects;
create policy "trip images owner update" on storage.objects for update to authenticated using (
  bucket_id = 'trip-images'
  and private.can_write_content()
  and exists (
    select 1
    from public.trips
    where trips.id = case
      when (storage.foldername(storage.objects.name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (storage.foldername(storage.objects.name))[2]::uuid
      else null
    end
      and trips.author_id::text = (storage.foldername(storage.objects.name))[1]
      and (trips.author_id = auth.uid() or private.is_admin())
  )
) with check (
  bucket_id = 'trip-images'
  and private.can_write_content()
  and exists (
    select 1
    from public.trips
    where trips.id = case
      when (storage.foldername(storage.objects.name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (storage.foldername(storage.objects.name))[2]::uuid
      else null
    end
      and trips.author_id::text = (storage.foldername(storage.objects.name))[1]
      and (trips.author_id = auth.uid() or private.is_admin())
  )
);

drop policy if exists "trip images owner delete" on storage.objects;
create policy "trip images owner delete" on storage.objects for delete to authenticated using (
  bucket_id = 'trip-images'
  and private.can_write_content()
  and exists (
    select 1
    from public.trips
    where trips.id = case
      when (storage.foldername(storage.objects.name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (storage.foldername(storage.objects.name))[2]::uuid
      else null
    end
      and trips.author_id::text = (storage.foldername(storage.objects.name))[1]
      and (trips.author_id = auth.uid() or private.is_admin())
  )
);

drop function if exists public.is_admin();
drop function if exists public.can_write_content();
drop function if exists public.current_profile_role();
drop function if exists public.current_profile_map_color();
drop function if exists public.consume_invite_code(text);
