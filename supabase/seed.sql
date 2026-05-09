-- Create admin@example.com in Supabase Auth before running this seed.
-- If that Auth user exists, this creates or promotes the matching profile.
insert into public.profiles (id, display_name, role, map_color)
select
  id,
  coalesce(nullif(raw_user_meta_data ->> 'display_name', ''), split_part(email, '@', 1), 'Admin'),
  'admin',
  '#c85f45'
from auth.users
where email = 'admin@example.com'
on conflict (id) do update
set role = 'admin',
    map_color = '#c85f45';

insert into public.invite_codes (code, role_to_grant, max_uses, created_by)
select 'FRIENDS-TRAVEL-2026', 'author', 10, id
from public.profiles
where role = 'admin'
on conflict (code) do nothing;
