create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url text,
  role text not null default 'author' check (role in ('admin', 'author', 'reader')),
  map_color text not null default '#2f6f7b' check (map_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (char_length(code) between 6 and 80),
  role_to_grant text not null default 'author' check (role_to_grant in ('author', 'reader')),
  max_uses integer not null default 10 check (max_uses between 1 and 100),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (used_count <= max_uses)
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  slug text unique not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text check (summary is null or char_length(summary) <= 240),
  content text not null check (char_length(content) >= 1),
  destination_name text not null check (char_length(destination_name) between 1 and 120),
  visited_at date not null,
  province text not null check (char_length(province) between 1 and 40),
  city text not null check (char_length(city) between 1 and 40),
  latitude numeric,
  longitude numeric,
  status text not null default 'draft' check (status in ('draft', 'published')),
  cover_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (
    (latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180)
  )
);

create table if not exists public.trip_assets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text unique not null,
  mime_type text not null check (mime_type in ('image/webp', 'image/jpeg', 'image/png')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 1000000),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists invite_codes_code_idx on public.invite_codes(code);
create index if not exists trips_author_id_idx on public.trips(author_id);
create index if not exists trips_status_published_at_idx on public.trips(status, published_at desc);
create index if not exists trips_city_idx on public.trips(province, city);
create index if not exists trip_assets_trip_id_idx on public.trip_assets(trip_id);
create index if not exists trip_assets_owner_id_idx on public.trip_assets(owner_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.can_write_content()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'author')
  );
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.current_profile_map_color()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select map_color
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.consume_invite_code(invite_code text)
returns table (role_to_grant text)
language plpgsql
security definer
set search_path = public
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
set search_path = public
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
  from public.consume_invite_code(invite_code) as consumed;

  insert into public.profiles (id, display_name, avatar_url, role)
  values (auth.uid(), cleaned_display_name, avatar_url, granted_role)
  returning * into new_profile;

  return new_profile;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists invite_codes_touch_updated_at on public.invite_codes;
create trigger invite_codes_touch_updated_at
before update on public.invite_codes
for each row execute function public.touch_updated_at();

drop trigger if exists trips_touch_updated_at on public.trips;
create trigger trips_touch_updated_at
before update on public.trips
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.trips enable row level security;
alter table public.trip_assets enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
revoke insert on public.profiles from authenticated;
grant update (display_name, avatar_url, role, map_color) on public.profiles to authenticated;
grant select, insert, update, delete on public.invite_codes to authenticated;
grant select, insert, update, delete on public.trips to authenticated;
grant select on public.trips to anon;
grant select, insert, update, delete on public.trip_assets to authenticated;
grant select on public.trip_assets to anon;

revoke all on function public.is_admin() from public;
revoke all on function public.can_write_content() from public;
revoke all on function public.current_profile_role() from public;
revoke all on function public.current_profile_map_color() from public;
revoke all on function public.consume_invite_code(text) from public;
revoke all on function public.create_profile_with_invite(text, text, text) from public;
grant execute on function public.create_profile_with_invite(text, text, text) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.can_write_content() to authenticated;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_profile_map_color() to authenticated;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select to anon, authenticated using (true);
drop policy if exists "profiles self insert" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = public.current_profile_role() and map_color = public.current_profile_map_color());
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "invite admin all" on public.invite_codes;
create policy "invite admin all" on public.invite_codes for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "trips published and owner read" on public.trips;
create policy "trips published and owner read" on public.trips for select to anon, authenticated using (status = 'published' or author_id = auth.uid() or public.is_admin());
drop policy if exists "trips author insert" on public.trips;
create policy "trips author insert" on public.trips for insert to authenticated with check (public.can_write_content() and author_id = auth.uid());
drop policy if exists "trips author update" on public.trips;
create policy "trips author update" on public.trips for update to authenticated using (public.can_write_content() and (author_id = auth.uid() or public.is_admin())) with check (public.can_write_content() and (author_id = auth.uid() or public.is_admin()));
drop policy if exists "trips author delete" on public.trips;
create policy "trips author delete" on public.trips for delete to authenticated using (public.can_write_content() and (author_id = auth.uid() or public.is_admin()));
drop policy if exists "assets published and owner read" on public.trip_assets;
create policy "assets published and owner read" on public.trip_assets for select to anon, authenticated using (exists (select 1 from public.trips where trips.id = trip_assets.trip_id and (trips.status = 'published' or trips.author_id = auth.uid() or public.is_admin())));
drop policy if exists "assets owner insert" on public.trip_assets;
create policy "assets owner insert" on public.trip_assets for insert to authenticated with check (
  public.can_write_content()
  and owner_id = auth.uid()
  and split_part(storage_path, '/', 1) = owner_id::text
  and split_part(storage_path, '/', 2) = trip_id::text
  and exists (
    select 1
    from public.trips
    where trips.id = trip_assets.trip_id
      and trips.author_id = trip_assets.owner_id
      and (trips.author_id = auth.uid() or public.is_admin())
  )
);
drop policy if exists "assets owner update" on public.trip_assets;
create policy "assets owner update" on public.trip_assets for update to authenticated using (public.can_write_content() and (owner_id = auth.uid() or public.is_admin())) with check (
  public.can_write_content()
  and (owner_id = auth.uid() or public.is_admin())
  and split_part(storage_path, '/', 1) = owner_id::text
  and split_part(storage_path, '/', 2) = trip_id::text
  and exists (
    select 1
    from public.trips
    where trips.id = trip_assets.trip_id
      and trips.author_id = trip_assets.owner_id
      and (trips.author_id = auth.uid() or public.is_admin())
  )
);
drop policy if exists "assets owner delete" on public.trip_assets;
create policy "assets owner delete" on public.trip_assets for delete to authenticated using (public.can_write_content() and (owner_id = auth.uid() or public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-images', 'trip-images', false, 1000000, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "trip images public read" on storage.objects;
drop policy if exists "trip images scoped read" on storage.objects;
create policy "trip images scoped read" on storage.objects for select to anon, authenticated using (
  bucket_id = 'trip-images'
  and (
    (
      auth.uid() is not null
      and (
        (storage.foldername(name))[1] = auth.uid()::text
        or public.is_admin()
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
  and public.can_write_content()
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.trips
    where trips.id = case
      when (storage.foldername(storage.objects.name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (storage.foldername(storage.objects.name))[2]::uuid
      else null
    end
      and (trips.author_id = auth.uid() or public.is_admin())
  )
);
drop policy if exists "trip images owner update" on storage.objects;
create policy "trip images owner update" on storage.objects for update to authenticated using (
  bucket_id = 'trip-images'
  and public.can_write_content()
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.trips
    where trips.id = case
      when (storage.foldername(storage.objects.name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (storage.foldername(storage.objects.name))[2]::uuid
      else null
    end
      and (trips.author_id = auth.uid() or public.is_admin())
  )
) with check (
  bucket_id = 'trip-images'
  and public.can_write_content()
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.trips
    where trips.id = case
      when (storage.foldername(storage.objects.name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (storage.foldername(storage.objects.name))[2]::uuid
      else null
    end
      and (trips.author_id = auth.uid() or public.is_admin())
  )
);
drop policy if exists "trip images owner delete" on storage.objects;
create policy "trip images owner delete" on storage.objects for delete to authenticated using (
  bucket_id = 'trip-images'
  and public.can_write_content()
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.trips
    where trips.id = case
      when (storage.foldername(storage.objects.name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (storage.foldername(storage.objects.name))[2]::uuid
      else null
    end
      and (trips.author_id = auth.uid() or public.is_admin())
  )
);
