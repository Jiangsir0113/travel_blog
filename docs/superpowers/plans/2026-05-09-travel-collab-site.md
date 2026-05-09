# 旅行共写小站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前 Astro 静态旅行博客升级为面向 5-10 位朋友的旅行共写小站，支持邀请码注册、登录、角色权限、游记编辑、图片压缩上传、公开展示、中国足迹图和 Cloudflare Pages 部署。

**Architecture:** Astro 切换为 Cloudflare Pages SSR，Supabase 负责 Auth、Postgres、Storage 和 RLS。应用通过 `@supabase/ssr` 在服务端维护 cookie 会话，所有敏感权限由数据库函数和 RLS 兜底，前端只做体验和表单校验。

**Tech Stack:** Astro 5、TypeScript、Supabase Auth/Postgres/Storage/RLS、`@supabase/supabase-js`、`@supabase/ssr`、`@astrojs/cloudflare`、browser image compression、Cloudflare Pages、Vitest。

---

## File Structure

### Configuration and Environment

- Modify: `package.json` - add SSR, Supabase, image compression, map/rendering and test dependencies.
- Modify: `astro.config.mjs` - enable Cloudflare adapter and server output.
- Modify: `src/env.d.ts` - add Cloudflare runtime and environment type declarations.
- Modify: `.env.example` - document Supabase publishable environment variables and local admin bootstrap variables.
- Create: `vitest.config.ts` - run focused utility tests.

### Supabase Schema

- Create: `supabase/migrations/20260509000000_travel_collab_core.sql` - tables, functions, grants, RLS, Storage policies.
- Create: `supabase/seed.sql` - local seed data for one admin profile and one invite code after a local test user exists.
- Create: `docs/superpowers/specs/2026-05-09-travel-collab-site-design.md` - already written, remains source design.

### Shared App Libraries

- Create: `src/lib/env.ts` - validate public Supabase environment variables.
- Create: `src/lib/supabase/server.ts` - create server-side Supabase client from request cookies.
- Create: `src/lib/supabase/browser.ts` - create browser Supabase client for image upload and interactive UI.
- Create: `src/lib/auth.ts` - user/profile loading and route guard helpers.
- Create: `src/lib/roles.ts` - role predicates.
- Create: `src/lib/slug.ts` - slug generation.
- Create: `src/lib/trips.ts` - typed trip queries and mutations.
- Create: `src/lib/assets.ts` - typed asset queries and Storage path helpers.
- Create: `src/lib/image-compression.ts` - browser image compression helper.
- Create: `src/lib/map-data.ts` - published trip aggregation for footprints.
- Test: `src/lib/slug.test.ts`, `src/lib/roles.test.ts`, `src/lib/assets.test.ts`.

### Layouts and Components

- Create: `src/layouts/BaseLayout.astro` - shared HTML shell.
- Create: `src/layouts/DashboardLayout.astro` - authenticated dashboard shell.
- Create: `src/components/auth/AuthForm.astro` - login/register form markup.
- Create: `src/components/trips/TripForm.astro` - editor form.
- Create: `src/components/trips/TripCard.astro` - public/dashboard trip card.
- Create: `src/components/trips/ImageUploader.astro` - upload UI and client script.
- Create: `src/components/maps/FootprintMap.astro` - SVG/canvas-style map view with city markers.
- Create: `src/components/admin/InviteCodeTable.astro` - admin invite list.
- Create: `src/components/admin/UserRoleTable.astro` - admin user role controls.

### Pages and Actions

- Modify: `src/pages/index.astro` - use Supabase published trips instead of Markdown collection.
- Create: `src/pages/auth/register.astro` - invite-code registration.
- Create: `src/pages/auth/login.astro` - password login.
- Create: `src/pages/auth/logout.ts` - sign out endpoint.
- Create: `src/pages/dashboard/index.astro` - current user's trip list.
- Create: `src/pages/dashboard/trips/new.astro` - create trip.
- Create: `src/pages/dashboard/trips/[id]/edit.astro` - edit trip.
- Create: `src/pages/admin/index.astro` - admin landing page.
- Create: `src/pages/admin/invites.astro` - invite management.
- Create: `src/pages/admin/users.astro` - user role and map color management.
- Create: `src/pages/admin/trips.astro` - all-trip management.
- Create: `src/pages/trips/index.astro` - public published trip list.
- Replace: `src/pages/trips/[slug].astro` - public Supabase-backed detail page.
- Create: `src/pages/footprints.astro` - public China footprint map.
- Create: `src/pages/api/assets/upload.ts` - authenticated Storage upload endpoint if direct browser upload is not enough.

### Visual Assets

- Keep: `public/images/sample-trip.svg` - existing visual fallback.
- Create: `public/images/travel-collab-hero.svg` - lightweight generated hero background.
- Create: `public/maps/china-provinces.geo.json` - simplified local China province outline.
- Create: `src/data/china-city-coordinates.ts` - curated city coordinates for map markers.

---

## Task 1: Add Dependencies and SSR Configuration

**Files:**
- Modify: `package.json`
- Modify: `astro.config.mjs`
- Modify: `src/env.d.ts`
- Modify: `.env.example`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install dependencies**

Run:

```bash
npm install @astrojs/cloudflare @supabase/supabase-js @supabase/ssr browser-image-compression
npm install -D vitest
```

Expected: `package.json` and `package-lock.json` include the new dependencies.

- [ ] **Step 2: Update scripts in `package.json`**

Ensure the scripts block is:

```json
{
  "scripts": {
    "dev": "cross-env ASTRO_TELEMETRY_DISABLED=1 astro dev",
    "build": "cross-env ASTRO_TELEMETRY_DISABLED=1 astro build",
    "preview": "cross-env ASTRO_TELEMETRY_DISABLED=1 astro preview",
    "check": "cross-env ASTRO_TELEMETRY_DISABLED=1 astro check",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: Configure Astro for Cloudflare SSR**

Replace `astro.config.mjs` with:

```js
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://travel-blog.pages.dev",
  output: "server",
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
});
```

- [ ] **Step 4: Add environment examples**

Replace `.env.example` with:

```bash
# Supabase project URL, for example https://xxxx.supabase.co
PUBLIC_SUPABASE_URL=

# Supabase publishable key. Do not use service_role in frontend code.
PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Local-only bootstrap helper. Used manually in SQL or scripts, not exposed to the browser.
BOOTSTRAP_ADMIN_EMAIL=
```

- [ ] **Step 5: Add runtime types**

Replace `src/env.d.ts` with:

```ts
/// <reference types="astro/client" />

type CloudflareEnv = {
  PUBLIC_SUPABASE_URL: string;
  PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
};

type Runtime = import("@astrojs/cloudflare").Runtime<CloudflareEnv>;

declare namespace App {
  interface Locals extends Runtime {
    user?: import("@supabase/supabase-js").User | null;
    profile?: {
      id: string;
      display_name: string;
      avatar_url: string | null;
      role: "admin" | "author" | "reader";
      map_color: string;
    } | null;
  }
}
```

- [ ] **Step 6: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 7: Verify dependency setup**

Run:

```bash
npm run check
npm run build
```

Expected: both commands complete successfully.

- [ ] **Step 8: Commit**

Run:

```bash
git add package.json package-lock.json astro.config.mjs src/env.d.ts .env.example vitest.config.ts
git commit -m "配置旅行共写小站 SSR 基础"
```

---

## Task 2: Create Supabase Schema, Functions, Grants, and RLS

**Files:**
- Create: `supabase/migrations/20260509000000_travel_collab_core.sql`
- Create: `supabase/seed.sql`

- [ ] **Step 1: Create migration directory**

Run:

```bash
mkdir -p supabase/migrations
```

On PowerShell, run:

```powershell
New-Item -ItemType Directory -Force -Path supabase\migrations
```

- [ ] **Step 2: Write core migration**

Create `supabase/migrations/20260509000000_travel_collab_core.sql`:

```sql
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

create or replace function public.consume_invite_code(invite_code text)
returns table (role_to_grant text)
language plpgsql
security definer
set search_path = public
as $$
declare
  matched public.invite_codes%rowtype;
begin
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

create or replace function public.set_trip_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and old.status <> 'published' then
    new.published_at = now();
  end if;

  if new.status = 'draft' then
    new.published_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists trips_set_published_at on public.trips;
create trigger trips_set_published_at
before update on public.trips
for each row execute function public.set_trip_published_at();

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.trips enable row level security;
alter table public.trip_assets enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant select, insert, update, delete on public.invite_codes to authenticated;
grant select, insert, update, delete on public.trips to authenticated;
grant select on public.trips to anon;
grant select, insert, update, delete on public.trip_assets to authenticated;
grant select on public.trip_assets to anon;
grant execute on function public.consume_invite_code(text) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read"
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "invite admin all" on public.invite_codes;
create policy "invite admin all"
on public.invite_codes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "trips published read" on public.trips;
create policy "trips published read"
on public.trips for select
to anon, authenticated
using (status = 'published' or author_id = auth.uid() or public.is_admin());

drop policy if exists "trips author insert" on public.trips;
create policy "trips author insert"
on public.trips for insert
to authenticated
with check (author_id = auth.uid());

drop policy if exists "trips author update" on public.trips;
create policy "trips author update"
on public.trips for update
to authenticated
using (author_id = auth.uid() or public.is_admin())
with check (author_id = auth.uid() or public.is_admin());

drop policy if exists "trips author delete" on public.trips;
create policy "trips author delete"
on public.trips for delete
to authenticated
using (author_id = auth.uid() or public.is_admin());

drop policy if exists "assets published read" on public.trip_assets;
create policy "assets published read"
on public.trip_assets for select
to anon, authenticated
using (
  exists (
    select 1
    from public.trips
    where trips.id = trip_assets.trip_id
      and (trips.status = 'published' or trips.author_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "assets owner insert" on public.trip_assets;
create policy "assets owner insert"
on public.trip_assets for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "assets owner update" on public.trip_assets;
create policy "assets owner update"
on public.trip_assets for update
to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "assets owner delete" on public.trip_assets;
create policy "assets owner delete"
on public.trip_assets for delete
to authenticated
using (owner_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-images', 'trip-images', true, 1000000, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "trip images public read" on storage.objects;
create policy "trip images public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'trip-images');

drop policy if exists "trip images owner insert" on storage.objects;
create policy "trip images owner insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'trip-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "trip images owner update" on storage.objects;
create policy "trip images owner update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'trip-images'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
)
with check (
  bucket_id = 'trip-images'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists "trip images owner delete" on storage.objects;
create policy "trip images owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'trip-images'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
```

- [ ] **Step 3: Add local seed instructions**

Create `supabase/seed.sql`:

```sql
-- Replace the email with the account created through Supabase Auth in local development.
update public.profiles
set role = 'admin', map_color = '#c85f45'
where id = (
  select id
  from auth.users
  where email = 'admin@example.com'
);

insert into public.invite_codes (code, role_to_grant, max_uses, created_by)
select 'FRIENDS-TRAVEL-2026', 'author', 10, id
from public.profiles
where role = 'admin'
on conflict (code) do nothing;
```

- [ ] **Step 4: Apply migration**

If Supabase CLI is available and linked:

```bash
supabase db push
```

Expected: migration applies without errors.

If using Supabase SQL Editor, paste the SQL from `supabase/migrations/20260509000000_travel_collab_core.sql` and run it once.

- [ ] **Step 5: Verify RLS and grants**

Run this in Supabase SQL Editor:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'invite_codes', 'trips', 'trip_assets');
```

Expected: all four rows have `rowsecurity = true`.

- [ ] **Step 6: Commit**

Run:

```bash
git add supabase/migrations/20260509000000_travel_collab_core.sql supabase/seed.sql
git commit -m "添加旅行共写小站 Supabase 数据结构"
```

---

## Task 3: Add Supabase Clients, Auth Helpers, and Tests

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/roles.ts`
- Create: `src/lib/roles.test.ts`
- Create: `src/lib/slug.ts`
- Create: `src/lib/slug.test.ts`
- Create: `src/lib/assets.ts`
- Create: `src/lib/assets.test.ts`
- Create: `src/lib/auth.ts`

- [ ] **Step 1: Add env helper**

Create `src/lib/env.ts`:

```ts
export function getSupabaseEnv() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return { url, publishableKey };
}
```

- [ ] **Step 2: Add server client**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import { getSupabaseEnv } from "../env";

export function createSupabaseServerClient({
  request,
  cookies,
}: {
  request: Request;
  cookies: AstroCookies;
}) {
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
    },
  });
}
```

- [ ] **Step 3: Add browser client**

Create `src/lib/supabase/browser.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "../env";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient(url, publishableKey);
}
```

- [ ] **Step 4: Add role helpers and tests**

Create `src/lib/roles.ts`:

```ts
export type UserRole = "admin" | "author" | "reader";

export function isAdmin(role: UserRole | null | undefined) {
  return role === "admin";
}

export function canWriteTrips(role: UserRole | null | undefined) {
  return role === "admin" || role === "author";
}
```

Create `src/lib/roles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canWriteTrips, isAdmin } from "./roles";

describe("role helpers", () => {
  it("identifies admins", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("author")).toBe(false);
  });

  it("allows admins and authors to write trips", () => {
    expect(canWriteTrips("admin")).toBe(true);
    expect(canWriteTrips("author")).toBe(true);
    expect(canWriteTrips("reader")).toBe(false);
  });
});
```

- [ ] **Step 5: Add slug helper and tests**

Create `src/lib/slug.ts`:

```ts
export function slugify(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    return `trip-${Date.now()}`;
  }

  return normalized
    .split("-")
    .map((part) => encodeURIComponent(part).replace(/%/g, "").toLowerCase())
    .join("-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

Create `src/lib/slug.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("turns english titles into URL slugs", () => {
    expect(slugify("A Trip to Shanghai!")).toBe("a-trip-to-shanghai");
  });

  it("keeps a deterministic non-empty value for Chinese titles", () => {
    expect(slugify("第一次出发")).toMatch(/^[a-z0-9-]+$/);
  });
});
```

- [ ] **Step 6: Add Storage path helper and tests**

Create `src/lib/assets.ts`:

```ts
export function buildTripImagePath({
  userId,
  tripId,
  imageId,
  extension = "webp",
}: {
  userId: string;
  tripId: string;
  imageId: string;
  extension?: "webp" | "jpg" | "png";
}) {
  return `${userId}/${tripId}/${imageId}.${extension}`;
}
```

Create `src/lib/assets.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildTripImagePath } from "./assets";

describe("buildTripImagePath", () => {
  it("names images under user and trip folders", () => {
    expect(
      buildTripImagePath({
        userId: "user-1",
        tripId: "trip-1",
        imageId: "image-1",
      }),
    ).toBe("user-1/trip-1/image-1.webp");
  });
});
```

- [ ] **Step 7: Add auth helper**

Create `src/lib/auth.ts`:

```ts
import type { APIContext } from "astro";
import { createSupabaseServerClient } from "./supabase/server";

export async function getSessionProfile(context: Pick<APIContext, "request" | "cookies">) {
  const supabase = createSupabaseServerClient({
    request: context.request,
    cookies: context.cookies,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role, map_color")
    .eq("id", user.id)
    .single();

  if (error) {
    return { supabase, user, profile: null };
  }

  return { supabase, user, profile };
}

export function redirectToLogin(request: Request) {
  const url = new URL(request.url);
  return `/auth/login?next=${encodeURIComponent(url.pathname)}`;
}
```

- [ ] **Step 8: Run tests**

Run:

```bash
npm run test
```

Expected: role, slug, and asset helper tests pass.

- [ ] **Step 9: Commit**

Run:

```bash
git add src/lib vitest.config.ts package.json package-lock.json
git commit -m "添加 Supabase 客户端与基础工具"
```

---

## Task 4: Add Layouts and Shared Navigation

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/layouts/DashboardLayout.astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add base layout**

Create `src/layouts/BaseLayout.astro`:

```astro
---
import "../styles/global.css";

interface Props {
  title: string;
  description?: string;
}

const { title, description = "朋友一起记录旅行、照片和足迹的共写小站。" } = Astro.props;
---

<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
    <meta name="description" content={description} />
  </head>
  <body>
    <div class="site-shell">
      <header class="site-header">
        <a class="brand" href="/">旅行共写小站</a>
        <nav class="nav" aria-label="主导航">
          <a href="/">首页</a>
          <a href="/trips/">游记</a>
          <a href="/footprints/">足迹图</a>
          <a href="/dashboard/">Dashboard</a>
        </nav>
      </header>
      <slot />
      <footer class="site-footer">
        <p>和朋友一起记录路线、照片、城市与再次回看的旅程。</p>
      </footer>
    </div>
  </body>
</html>
```

- [ ] **Step 2: Add dashboard layout**

Create `src/layouts/DashboardLayout.astro`:

```astro
---
import BaseLayout from "./BaseLayout.astro";

interface Props {
  title: string;
}

const { title } = Astro.props;
---

<BaseLayout title={title}>
  <main class="dashboard-shell">
    <aside class="dashboard-nav" aria-label="后台导航">
      <a href="/dashboard/">我的游记</a>
      <a href="/dashboard/trips/new/">新建游记</a>
      <a href="/admin/">管理员</a>
      <a href="/auth/logout/">退出</a>
    </aside>
    <section class="dashboard-main">
      <slot />
    </section>
  </main>
</BaseLayout>
```

- [ ] **Step 3: Add layout CSS**

Append to `src/styles/global.css`:

```css
.dashboard-shell {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 28px;
  padding: 32px 0 64px;
}

.dashboard-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-right: 1px solid var(--line);
  padding-right: 18px;
}

.dashboard-main {
  min-width: 0;
}

.form-grid {
  display: grid;
  gap: 16px;
  max-width: 760px;
}

.field {
  display: grid;
  gap: 6px;
}

.field input,
.field textarea,
.field select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  background: white;
  color: var(--ink);
  font: inherit;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--forest);
  border-radius: 8px;
  padding: 9px 14px;
  background: var(--forest);
  color: white;
  font-weight: 800;
  text-decoration: none;
}

.button.secondary {
  background: transparent;
  color: var(--forest);
}

@media (max-width: 820px) {
  .dashboard-shell {
    grid-template-columns: 1fr;
  }

  .dashboard-nav {
    border-right: 0;
    border-bottom: 1px solid var(--line);
    padding: 0 0 16px;
  }
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run check
```

Expected: no Astro type errors.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/layouts src/styles/global.css
git commit -m "添加旅行共写小站布局"
```

---

## Task 5: Implement Invite Registration, Login, and Logout

**Files:**
- Create: `src/pages/auth/register.astro`
- Create: `src/pages/auth/login.astro`
- Create: `src/pages/auth/logout.ts`

- [ ] **Step 1: Create register page**

Create `src/pages/auth/register.astro`:

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import { createSupabaseServerClient } from "../../lib/supabase/server";

const supabase = createSupabaseServerClient({
  request: Astro.request,
  cookies: Astro.cookies,
});

let message = "";

if (Astro.request.method === "POST") {
  const form = await Astro.request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const displayName = String(form.get("display_name") ?? "").trim();
  const inviteCode = String(form.get("invite_code") ?? "").trim();

  const { data: inviteRows, error: inviteError } = await supabase.rpc("consume_invite_code", {
    invite_code: inviteCode,
  });

  if (inviteError || !inviteRows?.[0]) {
    message = "邀请码无效、过期或已用完。";
  } else {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data.user) {
      message = error?.message ?? "注册失败，请稍后再试。";
    } else {
      const role = inviteRows[0].role_to_grant;
      const colors = ["#c85f45", "#2f6f7b", "#d7a65f", "#274c43", "#7b5ea7"];
      const mapColor = colors[Math.floor(Math.random() * colors.length)];

      await supabase.from("profiles").insert({
        id: data.user.id,
        display_name: displayName,
        role,
        map_color: mapColor,
      });

      return Astro.redirect("/dashboard/");
    }
  }
}
---

<BaseLayout title="注册 | 旅行共写小站">
  <main class="article">
    <p class="eyebrow">加入共写</p>
    <h1>用邀请码注册</h1>
    {message && <p class="meta">{message}</p>}
    <form class="form-grid" method="post">
      <label class="field">
        <span>昵称</span>
        <input name="display_name" required maxlength="60" />
      </label>
      <label class="field">
        <span>邮箱</span>
        <input name="email" type="email" required />
      </label>
      <label class="field">
        <span>密码</span>
        <input name="password" type="password" required minlength="6" />
      </label>
      <label class="field">
        <span>邀请码</span>
        <input name="invite_code" required />
      </label>
      <button class="button" type="submit">注册</button>
    </form>
  </main>
</BaseLayout>
```

- [ ] **Step 2: Create login page**

Create `src/pages/auth/login.astro`:

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import { createSupabaseServerClient } from "../../lib/supabase/server";

const supabase = createSupabaseServerClient({
  request: Astro.request,
  cookies: Astro.cookies,
});

const next = Astro.url.searchParams.get("next") ?? "/dashboard/";
let message = "";

if (Astro.request.method === "POST") {
  const form = await Astro.request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    message = "邮箱或密码不正确。";
  } else {
    return Astro.redirect(next);
  }
}
---

<BaseLayout title="登录 | 旅行共写小站">
  <main class="article">
    <p class="eyebrow">欢迎回来</p>
    <h1>登录后台</h1>
    {message && <p class="meta">{message}</p>}
    <form class="form-grid" method="post">
      <label class="field">
        <span>邮箱</span>
        <input name="email" type="email" required />
      </label>
      <label class="field">
        <span>密码</span>
        <input name="password" type="password" required />
      </label>
      <button class="button" type="submit">登录</button>
    </form>
  </main>
</BaseLayout>
```

- [ ] **Step 3: Create logout endpoint**

Create `src/pages/auth/logout.ts`:

```ts
import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const supabase = createSupabaseServerClient({ request, cookies });
  await supabase.auth.signOut();
  return redirect("/");
};
```

- [ ] **Step 4: Verify auth pages compile**

Run:

```bash
npm run check
```

Expected: no Astro type errors.

- [ ] **Step 5: Manual auth verification**

With Supabase env vars set and migration applied:

1. Visit `/auth/register/`.
2. Register with invite code `FRIENDS-TRAVEL-2026`.
3. Confirm redirect to `/dashboard/`.
4. Visit `/auth/logout/`.
5. Log in again at `/auth/login/`.

Expected: registration, logout, and login all complete without exposing secret keys.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/pages/auth
git commit -m "实现邀请码注册与登录退出"
```

---

## Task 6: Implement Dashboard and Trip Editor

**Files:**
- Create: `src/lib/trips.ts`
- Create: `src/components/trips/TripForm.astro`
- Create: `src/components/trips/TripCard.astro`
- Create: `src/pages/dashboard/index.astro`
- Create: `src/pages/dashboard/trips/new.astro`
- Create: `src/pages/dashboard/trips/[id]/edit.astro`

- [ ] **Step 1: Add trip query helpers**

Create `src/lib/trips.ts`:

```ts
import { slugify } from "./slug";

export type TripStatus = "draft" | "published";

export function normalizeTripForm(form: FormData, authorId: string) {
  const title = String(form.get("title") ?? "").trim();
  const status = String(form.get("status") ?? "draft") as TripStatus;

  return {
    author_id: authorId,
    title,
    slug: slugify(`${title}-${String(form.get("visited_at") ?? "")}`),
    summary: String(form.get("summary") ?? "").trim(),
    content: String(form.get("content") ?? "").trim(),
    destination_name: String(form.get("destination_name") ?? "").trim(),
    visited_at: String(form.get("visited_at") ?? ""),
    province: String(form.get("province") ?? "").trim(),
    city: String(form.get("city") ?? "").trim(),
    latitude: form.get("latitude") ? Number(form.get("latitude")) : null,
    longitude: form.get("longitude") ? Number(form.get("longitude")) : null,
    status: status === "published" ? "published" : "draft",
  };
}
```

- [ ] **Step 2: Add trip card**

Create `src/components/trips/TripCard.astro`:

```astro
---
interface Props {
  trip: {
    id?: string;
    slug: string;
    title: string;
    summary: string | null;
    destination_name: string;
    visited_at: string;
    status?: string;
  };
  mode?: "public" | "dashboard";
}

const { trip, mode = "public" } = Astro.props;
const href = mode === "dashboard" ? `/dashboard/trips/${trip.id}/edit/` : `/trips/${trip.slug}/`;
---

<article class="card">
  <p class="meta">{trip.destination_name} · {trip.visited_at}</p>
  <h3><a href={href}>{trip.title}</a></h3>
  {trip.summary && <p>{trip.summary}</p>}
  {trip.status && <span class="tag">{trip.status === "published" ? "已发布" : "草稿"}</span>}
</article>
```

- [ ] **Step 3: Add trip form**

Create `src/components/trips/TripForm.astro`:

```astro
---
interface Props {
  trip?: Record<string, unknown>;
  action: string;
}

const { trip, action } = Astro.props;
---

<form class="form-grid" method="post" action={action}>
  <label class="field">
    <span>标题</span>
    <input name="title" required maxlength="120" value={trip?.title ?? ""} />
  </label>
  <label class="field">
    <span>摘要</span>
    <textarea name="summary" maxlength="240" rows="3">{trip?.summary ?? ""}</textarea>
  </label>
  <label class="field">
    <span>正文</span>
    <textarea name="content" required rows="12">{trip?.content ?? ""}</textarea>
  </label>
  <label class="field">
    <span>旅行日期</span>
    <input name="visited_at" type="date" required value={trip?.visited_at ?? ""} />
  </label>
  <label class="field">
    <span>地点名称</span>
    <input name="destination_name" required value={trip?.destination_name ?? ""} />
  </label>
  <label class="field">
    <span>省份</span>
    <input name="province" required value={trip?.province ?? ""} />
  </label>
  <label class="field">
    <span>城市</span>
    <input name="city" required value={trip?.city ?? ""} />
  </label>
  <label class="field">
    <span>纬度</span>
    <input name="latitude" type="number" step="0.000001" value={trip?.latitude ?? ""} />
  </label>
  <label class="field">
    <span>经度</span>
    <input name="longitude" type="number" step="0.000001" value={trip?.longitude ?? ""} />
  </label>
  <label class="field">
    <span>状态</span>
    <select name="status">
      <option value="draft" selected={trip?.status !== "published"}>保存草稿</option>
      <option value="published" selected={trip?.status === "published"}>直接发布</option>
    </select>
  </label>
  <div class="button-row">
    <button class="button" type="submit">保存游记</button>
    <a class="button secondary" href="/dashboard/">返回列表</a>
  </div>
</form>
```

- [ ] **Step 4: Add dashboard list**

Create `src/pages/dashboard/index.astro` with authenticated trip list using `getSessionProfile()`. Redirect to login when no user, select `trips` where `author_id = user.id`, render `TripCard` with `mode="dashboard"`.

Use this frontmatter:

```astro
---
import DashboardLayout from "../../layouts/DashboardLayout.astro";
import TripCard from "../../components/trips/TripCard.astro";
import { getSessionProfile, redirectToLogin } from "../../lib/auth";

const { supabase, user } = await getSessionProfile(Astro);

if (!user) {
  return Astro.redirect(redirectToLogin(Astro.request));
}

const { data: trips = [] } = await supabase
  .from("trips")
  .select("id, slug, title, summary, destination_name, visited_at, status")
  .eq("author_id", user.id)
  .order("updated_at", { ascending: false });
---
```

The markup is:

```astro
<DashboardLayout title="我的游记 | 旅行共写小站">
  <div class="button-row">
    <a class="button" href="/dashboard/trips/new/">新建游记</a>
  </div>
  <section class="section">
    <h1>我的游记</h1>
    <div class="grid">
      {trips.map((trip) => <TripCard trip={trip} mode="dashboard" />)}
    </div>
  </section>
</DashboardLayout>
```

- [ ] **Step 5: Add new trip page**

Create `src/pages/dashboard/trips/new.astro`. On `POST`, call `normalizeTripForm(form, user.id)`, insert into `trips`, and redirect to `/dashboard/`.

Expected insert call:

```ts
await supabase.from("trips").insert(normalizeTripForm(form, user.id));
```

- [ ] **Step 6: Add edit trip page**

Create `src/pages/dashboard/trips/[id]/edit.astro`. On `GET`, load trip by `id`; on `POST`, call `normalizeTripForm(form, user.id)`, remove `author_id`, update by `id`, and redirect to `/dashboard/`.

Expected update call:

```ts
const payload = normalizeTripForm(form, user.id);
const { author_id: _authorId, ...updatePayload } = payload;
await supabase.from("trips").update(updatePayload).eq("id", id);
```

- [ ] **Step 7: Verify dashboard**

Run:

```bash
npm run check
npm run build
```

Expected: both pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/lib/trips.ts src/components/trips src/pages/dashboard
git commit -m "实现游记后台与编辑器"
```

---

## Task 7: Implement Browser Image Compression and Upload

**Files:**
- Create: `src/lib/image-compression.ts`
- Create: `src/components/trips/ImageUploader.astro`
- Modify: `src/pages/dashboard/trips/[id]/edit.astro`

- [ ] **Step 1: Add compression helper**

Create `src/lib/image-compression.ts`:

```ts
import imageCompression from "browser-image-compression";

export async function compressTripImage(file: File) {
  return imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.82,
  });
}
```

- [ ] **Step 2: Add uploader component**

Create `src/components/trips/ImageUploader.astro`:

```astro
---
interface Props {
  tripId: string;
  userId: string;
}

const { tripId, userId } = Astro.props;
---

<section class="section" data-image-uploader data-trip-id={tripId} data-user-id={userId}>
  <h2>照片</h2>
  <input type="file" accept="image/png,image/jpeg,image/webp" multiple />
  <p class="meta" data-upload-status>选择图片后会自动压缩并上传。</p>
</section>

<script>
  import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
  import { buildTripImagePath } from "../../lib/assets";
  import { compressTripImage } from "../../lib/image-compression";

  const root = document.querySelector("[data-image-uploader]");
  const input = root?.querySelector("input");
  const status = root?.querySelector("[data-upload-status]");

  input?.addEventListener("change", async () => {
    const files = Array.from(input.files ?? []);
    const tripId = root?.getAttribute("data-trip-id") ?? "";
    const userId = root?.getAttribute("data-user-id") ?? "";
    const supabase = createSupabaseBrowserClient();

    for (const file of files.slice(0, 12)) {
      const compressed = await compressTripImage(file);
      const imageId = crypto.randomUUID();
      const path = buildTripImagePath({ userId, tripId, imageId });
      const { error } = await supabase.storage.from("trip-images").upload(path, compressed, {
        contentType: "image/webp",
      });

      if (error) {
        if (status) status.textContent = `上传失败：${error.message}`;
        return;
      }

      await supabase.from("trip_assets").insert({
        trip_id: tripId,
        owner_id: userId,
        storage_path: path,
        mime_type: "image/webp",
        size_bytes: compressed.size,
      });
    }

    if (status) status.textContent = "图片已压缩并上传。";
  });
</script>
```

- [ ] **Step 3: Render uploader on edit page**

In `src/pages/dashboard/trips/[id]/edit.astro`, import and render:

```astro
---
import ImageUploader from "../../../../components/trips/ImageUploader.astro";
---

<ImageUploader tripId={trip.id} userId={user.id} />
```

- [ ] **Step 4: Manual upload verification**

With a logged-in author and existing trip:

1. Open `/dashboard/trips/[id]/edit/`.
2. Upload a JPEG larger than 1MB.
3. Confirm Supabase Storage receives a WebP under `{user_id}/{trip_id}/`.
4. Confirm `trip_assets` has a row with `size_bytes <= 1000000`.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/image-compression.ts src/components/trips/ImageUploader.astro src/pages/dashboard/trips
git commit -m "实现游记图片压缩上传"
```

---

## Task 8: Implement Public Trip List and Detail Pages

**Files:**
- Create: `src/pages/trips/index.astro`
- Replace: `src/pages/trips/[slug].astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Add public trip list**

Create `src/pages/trips/index.astro` that queries published trips:

```ts
const { data: trips = [] } = await supabase
  .from("trips")
  .select("slug, title, summary, destination_name, visited_at")
  .eq("status", "published")
  .order("published_at", { ascending: false });
```

Render each item with `TripCard`.

- [ ] **Step 2: Replace detail page**

Replace `src/pages/trips/[slug].astro` with a Supabase-backed page that:

1. Reads `Astro.params.slug`.
2. Queries one published trip by slug.
3. Queries `trip_assets` for images.
4. Renders title, destination, date, summary, content, and image gallery.
5. Returns `404` when no published trip exists.

- [ ] **Step 3: Update homepage**

Modify `src/pages/index.astro` to:

1. Stop importing `getCollection`.
2. Use `BaseLayout`.
3. Query latest three published trips from Supabase.
4. Link to `/trips/` and `/footprints/`.

- [ ] **Step 4: Verify public pages**

Run:

```bash
npm run check
npm run build
```

Manual checks:

```text
/trips/ shows only published trips.
/trips/[slug]/ returns 404 for drafts.
/ shows latest published trips.
```

- [ ] **Step 5: Commit**

Run:

```bash
git add src/pages/index.astro src/pages/trips
git commit -m "实现公开游记列表和详情"
```

---

## Task 9: Implement Footprint Map

**Files:**
- Create: `src/data/china-city-coordinates.ts`
- Create: `public/maps/china-provinces.geo.json`
- Create: `src/lib/map-data.ts`
- Create: `src/components/maps/FootprintMap.astro`
- Create: `src/pages/footprints.astro`

- [ ] **Step 1: Add city coordinate seed**

Create `src/data/china-city-coordinates.ts`:

```ts
export const cityCoordinates: Record<string, { x: number; y: number }> = {
  上海市: { x: 77, y: 59 },
  北京市: { x: 69, y: 34 },
  广州市: { x: 63, y: 78 },
  深圳市: { x: 64, y: 81 },
  杭州市: { x: 73, y: 61 },
  成都市: { x: 43, y: 61 },
  西安市: { x: 52, y: 50 },
  武汉市: { x: 61, y: 60 },
  南京市: { x: 72, y: 55 },
  厦门市: { x: 70, y: 75 },
};
```

- [ ] **Step 2: Add simplified map file**

Create `public/maps/china-provinces.geo.json` with a simplified GeoJSON `FeatureCollection`. The first implementation renders the visible outline in `FootprintMap.astro`; this file is the stable data location for replacing the hand-drawn outline with real simplified province geometry in a later dedicated map-data task.

Use this minimal valid file:

```json
{
  "type": "FeatureCollection",
  "features": []
}
```

- [ ] **Step 3: Add map aggregation helper**

Create `src/lib/map-data.ts`:

```ts
import { cityCoordinates } from "../data/china-city-coordinates";

export type FootprintTrip = {
  slug: string;
  title: string;
  city: string;
  province: string;
  profiles: {
    display_name: string;
    map_color: string;
  } | null;
};

export function groupTripsByCity(trips: FootprintTrip[]) {
  return trips.reduce<Record<string, { city: string; x: number; y: number; trips: FootprintTrip[] }>>(
    (groups, trip) => {
      const coords = cityCoordinates[trip.city] ?? { x: 50, y: 50 };
      groups[trip.city] ??= { city: trip.city, x: coords.x, y: coords.y, trips: [] };
      groups[trip.city].trips.push(trip);
      return groups;
    },
    {},
  );
}
```

- [ ] **Step 4: Add FootprintMap component**

Create `src/components/maps/FootprintMap.astro`:

```astro
---
import { groupTripsByCity, type FootprintTrip } from "../../lib/map-data";

interface Props {
  trips: FootprintTrip[];
}

const groups = Object.values(groupTripsByCity(Astro.props.trips));
---

<section class="footprint-map" aria-label="中国旅行足迹图">
  <svg viewBox="0 0 100 90" role="img" aria-label="中国城市足迹点位">
    <path d="M18 28 L33 18 L55 20 L75 30 L84 48 L73 70 L49 79 L27 68 L16 49 Z" fill="#f3eadc" stroke="#ded6c9" stroke-width="1.2" />
    {
      groups.map((group) => (
        <g>
          <circle cx={group.x} cy={group.y} r="2.6" fill={group.trips[0].profiles?.map_color ?? "#2f6f7b"} />
          <title>{group.city}：{group.trips.length} 篇游记</title>
        </g>
      ))
    }
  </svg>
  <div class="grid">
    {
      groups.map((group) => (
        <article class="card">
          <h3>{group.city}</h3>
          <p>{group.trips.length} 篇游记</p>
          {group.trips.slice(0, 3).map((trip) => <a href={`/trips/${trip.slug}/`}>{trip.title}</a>)}
        </article>
      ))
    }
  </div>
</section>
```

- [ ] **Step 5: Add footprint page**

Create `src/pages/footprints.astro` to query published trips joined with profiles and render `FootprintMap`.

Expected query:

```ts
const { data: trips = [] } = await supabase
  .from("trips")
  .select("slug, title, city, province, profiles(display_name, map_color)")
  .eq("status", "published");
```

- [ ] **Step 6: Add map CSS**

Append to `src/styles/global.css`:

```css
.footprint-map svg {
  width: 100%;
  min-height: 360px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fffdf8;
}

.footprint-map circle {
  stroke: white;
  stroke-width: 0.8;
}
```

- [ ] **Step 7: Commit**

Run:

```bash
git add src/data src/lib/map-data.ts src/components/maps src/pages/footprints.astro public/maps src/styles/global.css
git commit -m "实现中国城市足迹图"
```

---

## Task 10: Implement Admin Pages

**Files:**
- Create: `src/pages/admin/index.astro`
- Create: `src/pages/admin/invites.astro`
- Create: `src/pages/admin/users.astro`
- Create: `src/pages/admin/trips.astro`
- Create: `src/components/admin/InviteCodeTable.astro`
- Create: `src/components/admin/UserRoleTable.astro`

- [ ] **Step 1: Add admin guard pattern**

Use this frontmatter at the top of each admin page:

```astro
---
import DashboardLayout from "../../layouts/DashboardLayout.astro";
import { getSessionProfile, redirectToLogin } from "../../lib/auth";
import { isAdmin } from "../../lib/roles";

const { supabase, user, profile } = await getSessionProfile(Astro);

if (!user) {
  return Astro.redirect(redirectToLogin(Astro.request));
}

if (!isAdmin(profile?.role)) {
  return Astro.redirect("/dashboard/");
}
---
```

- [ ] **Step 2: Add admin index**

Create `src/pages/admin/index.astro` with links to `/admin/invites/`, `/admin/users/`, and `/admin/trips/`.

- [ ] **Step 3: Add invite management**

Create `src/pages/admin/invites.astro`. On `POST`, generate a code with:

```ts
const code = `TRAVEL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
await supabase.from("invite_codes").insert({
  code,
  role_to_grant: "author",
  max_uses: 10,
  created_by: user.id,
});
```

Render existing invite codes with code, used count, max uses, active status, and created date.

- [ ] **Step 4: Add user role management**

Create `src/pages/admin/users.astro`. On `POST`, update selected user's role and map color:

```ts
await supabase
  .from("profiles")
  .update({ role, map_color: mapColor })
  .eq("id", profileId);
```

Render users with role select values `admin`, `author`, and `reader`.

- [ ] **Step 5: Add all-trip management**

Create `src/pages/admin/trips.astro` to list all trips with author profile, status, city, and edit link. Admin editing can reuse `/dashboard/trips/[id]/edit/` because RLS permits admin updates.

- [ ] **Step 6: Verify admin restrictions**

Manual checks:

```text
author visiting /admin/ redirects to /dashboard/
admin can create invite code
admin can change author map color
admin can see all trips
```

- [ ] **Step 7: Commit**

Run:

```bash
git add src/pages/admin src/components/admin
git commit -m "实现管理员后台"
```

---

## Task 11: Add Visual Polish and Generated Assets

**Files:**
- Create: `public/images/travel-collab-hero.svg`
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Create lightweight hero asset**

Create `public/images/travel-collab-hero.svg` with a simple map-and-photo inspired vector background:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720" role="img" aria-labelledby="title">
  <title id="title">旅行共写小站背景图</title>
  <rect width="1200" height="720" fill="#fffaf2"/>
  <path d="M120 510 C260 390 360 560 520 420 S780 250 1040 330" fill="none" stroke="#2f6f7b" stroke-width="18" stroke-linecap="round" opacity=".24"/>
  <path d="M180 250 L360 170 L520 270 L710 130 L990 250 L990 560 L180 560 Z" fill="#f3eadc" stroke="#ded6c9" stroke-width="6"/>
  <circle cx="360" cy="170" r="22" fill="#c85f45"/>
  <circle cx="710" cy="130" r="22" fill="#274c43"/>
  <circle cx="990" cy="250" r="22" fill="#d7a65f"/>
  <rect x="250" y="360" width="250" height="140" rx="8" fill="#ffffff" stroke="#ded6c9" stroke-width="5"/>
  <rect x="560" y="340" width="310" height="170" rx="8" fill="#ffffff" stroke="#ded6c9" stroke-width="5"/>
</svg>
```

- [ ] **Step 2: Update homepage hero**

Modify `src/pages/index.astro` hero image to use:

```astro
<img src="/images/travel-collab-hero.svg" alt="地图路线、城市标记和照片卡片组成的旅行共写背景图" />
```

- [ ] **Step 3: Verify visual layout**

Run:

```bash
npm run build
```

Open `http://127.0.0.1:4321/` and verify:

```text
hero image loads
navigation fits on mobile width
buttons and cards do not overlap
```

- [ ] **Step 4: Commit**

Run:

```bash
git add public/images/travel-collab-hero.svg src/pages/index.astro src/styles/global.css
git commit -m "优化旅行共写小站首页视觉"
```

---

## Task 12: Configure Cloudflare Pages Deployment

**Files:**
- Modify: `README.md`
- Create: `docs/deploy-cloudflare-pages.md`

- [ ] **Step 1: Add deployment guide**

Create `docs/deploy-cloudflare-pages.md`:

```md
# Cloudflare Pages 部署

## 构建设置

- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`

## 环境变量

```text
PUBLIC_SUPABASE_URL=<Supabase Project URL>
PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase Publishable Key>
```

不要在 Cloudflare Pages 中配置 Supabase `service_role` key。

## 部署后验证

1. 打开首页。
2. 打开 `/trips/`。
3. 打开 `/auth/login/`。
4. 登录作者账号。
5. 新建一篇草稿。
6. 发布游记。
7. 确认 `/footprints/` 出现对应城市点位。
```

- [ ] **Step 2: Update README commands**

Add this section to `README.md`:

```md
## 部署

项目使用 Cloudflare Pages 部署。构建命令为 `npm run build`，输出目录为 `dist`。

部署前需要在 Cloudflare Pages 中配置：

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`

详细步骤见 `docs/deploy-cloudflare-pages.md`。
```

- [ ] **Step 3: Run final verification**

Run:

```bash
npm run test
npm run check
npm run build
```

Expected: all pass.

- [ ] **Step 4: Commit**

Run:

```bash
git add README.md docs/deploy-cloudflare-pages.md
git commit -m "补充 Cloudflare Pages 部署说明"
```

---

## Task 13: End-to-End Acceptance Pass

**Files:**
- Modify files only if acceptance reveals a bug.

- [ ] **Step 1: Create or identify admin**

In Supabase Auth, create the first user with the admin email. Run `supabase/seed.sql` after replacing `admin@example.com` with that email.

Expected: the user has `profiles.role = 'admin'`.

- [ ] **Step 2: Create invite**

Log in as admin and create a new invite from `/admin/invites/`.

Expected: invite has `max_uses = 10` and `used_count = 0`.

- [ ] **Step 3: Register author**

Open `/auth/register/` in a private browser window and register with the invite code.

Expected: new user has `profiles.role = 'author'`; invite `used_count` increments to `1`.

- [ ] **Step 4: Create and publish trip**

As author:

1. Open `/dashboard/trips/new/`.
2. Fill title, summary, content, date, province, city, destination.
3. Set status to `published`.
4. Save.

Expected: redirect to dashboard and trip appears as `已发布`.

- [ ] **Step 5: Upload image**

Open the edit page for the trip and upload one image.

Expected: compressed image appears in Supabase Storage and `trip_assets`.

- [ ] **Step 6: Verify public pages**

Open:

```text
/trips/
/trips/[slug]/
/footprints/
```

Expected: published trip appears in all three places.

- [ ] **Step 7: Verify RLS**

As another author, attempt to edit the first author's trip by visiting its edit URL.

Expected: page does not expose editable content or update succeeds with zero rows blocked by RLS.

- [ ] **Step 8: Final commit if fixes were needed**

If acceptance required fixes:

```bash
git add .
git commit -m "修复旅行共写小站验收问题"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review Notes

- Spec coverage: registration with 10-use invite, roles, admin-only role changes, dashboard, editor, image compression, public list/detail, footprints, RLS, Storage and Cloudflare deployment all map to tasks above.
- Supabase breaking-change coverage: migration includes explicit `grant` statements for exposed public tables and enables RLS on every exposed table.
- Cost coverage: image compression and Storage limits are implemented before public deployment.
- Map scope coverage: first version uses province outline plus city markers with per-user colors, not commercial map tiles.
