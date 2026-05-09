-- Create the first Supabase Auth user before running this seed.
-- The earliest Auth user is promoted to admin, then receives one random author invite.
with bootstrap_admin as (
  select id, email, raw_user_meta_data
  from auth.users
  order by created_at asc
  limit 1
),
upserted_admin as (
  insert into public.profiles (id, display_name, role, map_color)
  select
    id,
    coalesce(nullif(raw_user_meta_data ->> 'display_name', ''), split_part(email, '@', 1), 'Admin'),
    'admin',
    '#c85f45'
  from bootstrap_admin
  on conflict (id) do update
  set role = 'admin',
      map_color = '#c85f45'
  returning id
)
insert into public.invite_codes (code, role_to_grant, max_uses, created_by)
select 'invite-' || encode(gen_random_bytes(12), 'hex'), 'author', 10, id
from upserted_admin
where not exists (
  select 1
  from public.invite_codes
  where created_by = upserted_admin.id
    and role_to_grant = 'author'
    and used_count = 0
    and is_active
);
