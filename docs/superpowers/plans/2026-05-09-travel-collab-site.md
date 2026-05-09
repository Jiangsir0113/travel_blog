# 旅行共写小站实施计划

> **给执行代理的要求：** 实施本计划时必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`。步骤使用复选框语法追踪进度，每完成一个任务就运行验证并提交一次。

**目标：** 将当前 Astro 静态旅行博客升级为面向 5-10 位朋友的旅行共写小站，支持邀请码注册、账号密码登录、用户资料与角色、游记后台、图片压缩上传、公开游记、城市足迹图、RLS 权限和 Cloudflare Pages 部署。

**架构：** Astro 从静态站点切换为 Cloudflare Pages SSR。Supabase 负责 Auth、Postgres、Storage 和 RLS；Astro 通过 `@supabase/ssr` 维护 cookie 会话。所有敏感权限以数据库函数和 RLS 为准，前端只负责页面体验和表单校验。

**技术栈：** Astro 5、TypeScript、Supabase Auth/Postgres/Storage/RLS、`@supabase/supabase-js`、`@supabase/ssr`、`@astrojs/cloudflare`、浏览器端图片压缩、Cloudflare Pages、Vitest。

---

## 文件结构规划

### 配置与环境

- 修改：`package.json`，增加 SSR、Supabase、图片压缩和测试依赖。
- 修改：`astro.config.mjs`，启用 Cloudflare adapter 和 server 输出。
- 修改：`src/env.d.ts`，补充 Cloudflare runtime 和环境变量类型。
- 修改：`.env.example`，记录 Supabase 公开环境变量和本地管理员初始化变量。
- 创建：`vitest.config.ts`，运行工具函数测试。

### Supabase 数据结构

- 创建：`supabase/migrations/20260509000000_travel_collab_core.sql`，包含表结构、函数、授权、RLS 和 Storage policy。
- 创建：`supabase/seed.sql`，用于本地把第一个用户提升为管理员并创建默认邀请码。

### 共享代码

- 创建：`src/lib/env.ts`，校验 Supabase 环境变量。
- 创建：`src/lib/supabase/server.ts`，创建服务端 Supabase client。
- 创建：`src/lib/supabase/browser.ts`，创建浏览器 Supabase client。
- 创建：`src/lib/auth.ts`，加载用户、资料和路由保护。
- 创建：`src/lib/roles.ts`，封装角色判断。
- 创建：`src/lib/slug.ts`，生成游记 slug。
- 创建：`src/lib/trips.ts`，封装游记表单标准化和数据操作。
- 创建：`src/lib/assets.ts`，封装图片路径和资源工具。
- 创建：`src/lib/image-compression.ts`，封装浏览器图片压缩。
- 创建：`src/lib/map-data.ts`，聚合足迹图数据。
- 测试：`src/lib/slug.test.ts`、`src/lib/roles.test.ts`、`src/lib/assets.test.ts`。

### 布局与组件

- 创建：`src/layouts/BaseLayout.astro`，公共 HTML 外壳。
- 创建：`src/layouts/DashboardLayout.astro`，后台页面外壳。
- 创建：`src/components/trips/TripForm.astro`，游记编辑表单。
- 创建：`src/components/trips/TripCard.astro`，游记卡片。
- 创建：`src/components/trips/ImageUploader.astro`，图片压缩上传组件。
- 创建：`src/components/maps/FootprintMap.astro`，中国城市足迹图。

### 页面

- 修改：`src/pages/index.astro`，从 Markdown 数据切换为 Supabase 已发布游记。
- 创建：`src/pages/auth/register.astro`，邀请码注册。
- 创建：`src/pages/auth/login.astro`，账号密码登录。
- 创建：`src/pages/auth/logout.ts`，退出登录。
- 创建：`src/pages/dashboard/index.astro`，我的游记列表。
- 创建：`src/pages/dashboard/trips/new.astro`，新建游记。
- 创建：`src/pages/dashboard/trips/[id]/edit.astro`，编辑游记。
- 创建：`src/pages/admin/index.astro`，管理员入口。
- 创建：`src/pages/admin/invites.astro`，邀请码管理。
- 创建：`src/pages/admin/users.astro`，用户角色和地图颜色管理。
- 创建：`src/pages/admin/trips.astro`，全部游记管理。
- 创建：`src/pages/trips/index.astro`，公开游记列表。
- 替换：`src/pages/trips/[slug].astro`，改为 Supabase 公开详情页。
- 创建：`src/pages/footprints.astro`，公开中国足迹图。

### 视觉与地图素材

- 保留：`public/images/sample-trip.svg`，作为备用视觉素材。
- 创建：`public/images/travel-collab-hero.svg`，旅行共写首页背景图。
- 创建：`public/maps/china-provinces.geo.json`，预留简化中国地图数据位置。
- 创建：`src/data/china-city-coordinates.ts`，常用城市点位坐标。

---

## 任务 1：配置依赖和 Cloudflare SSR

**文件：**
- 修改：`package.json`
- 修改：`astro.config.mjs`
- 修改：`src/env.d.ts`
- 修改：`.env.example`
- 创建：`vitest.config.ts`

- [ ] **步骤 1：安装依赖**

运行：

```bash
npm install @astrojs/cloudflare @supabase/supabase-js @supabase/ssr browser-image-compression
npm install -D vitest
```

预期：`package.json` 和 `package-lock.json` 出现新增依赖。

- [ ] **步骤 2：补充测试脚本**

确认 `package.json` 的脚本包含：

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

- [ ] **步骤 3：配置 Astro SSR**

将 `astro.config.mjs` 改为：

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

- [ ] **步骤 4：更新环境变量示例**

将 `.env.example` 改为：

```bash
# Supabase 项目 URL，例如 https://xxxx.supabase.co
PUBLIC_SUPABASE_URL=

# Supabase publishable key。不要在前端使用 service_role。
PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# 本地初始化管理员时使用，不暴露给浏览器。
BOOTSTRAP_ADMIN_EMAIL=
```

- [ ] **步骤 5：补充运行时类型**

将 `src/env.d.ts` 改为：

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

- [ ] **步骤 6：新增 Vitest 配置**

创建 `vitest.config.ts`：

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **步骤 7：验证配置**

运行：

```bash
npm run check
npm run build
```

预期：两个命令都成功。

- [ ] **步骤 8：提交**

运行：

```bash
git add package.json package-lock.json astro.config.mjs src/env.d.ts .env.example vitest.config.ts
git commit -m "配置旅行共写小站 SSR 基础"
```

---

## 任务 2：创建 Supabase 数据结构、函数、授权和 RLS

**文件：**
- 创建：`supabase/migrations/20260509000000_travel_collab_core.sql`
- 创建：`supabase/seed.sql`

- [ ] **步骤 1：创建迁移目录**

PowerShell 运行：

```powershell
New-Item -ItemType Directory -Force -Path supabase\migrations
```

- [ ] **步骤 2：写入核心迁移**

创建 `supabase/migrations/20260509000000_travel_collab_core.sql`：

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

create policy "profiles public read"
on public.profiles for select
to anon, authenticated
using (true);

create policy "profiles self update"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles admin update"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "invite admin all"
on public.invite_codes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "trips published and owner read"
on public.trips for select
to anon, authenticated
using (status = 'published' or author_id = auth.uid() or public.is_admin());

create policy "trips author insert"
on public.trips for insert
to authenticated
with check (author_id = auth.uid());

create policy "trips author update"
on public.trips for update
to authenticated
using (author_id = auth.uid() or public.is_admin())
with check (author_id = auth.uid() or public.is_admin());

create policy "trips author delete"
on public.trips for delete
to authenticated
using (author_id = auth.uid() or public.is_admin());

create policy "assets published and owner read"
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

create policy "assets owner insert"
on public.trip_assets for insert
to authenticated
with check (owner_id = auth.uid());

create policy "assets owner update"
on public.trip_assets for update
to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

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

create policy "trip images public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'trip-images');

create policy "trip images owner insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'trip-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

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

create policy "trip images owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'trip-images'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
```

- [ ] **步骤 3：写入本地 seed**

创建 `supabase/seed.sql`：

```sql
-- 将 admin@example.com 替换为你在 Supabase Auth 中创建的管理员邮箱。
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

- [ ] **步骤 4：执行迁移**

如果已安装并连接 Supabase CLI，运行：

```bash
supabase db push
```

如果使用 Supabase 控制台，则把迁移 SQL 粘贴到 SQL Editor 中执行。

- [ ] **步骤 5：验证 RLS**

在 Supabase SQL Editor 运行：

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'invite_codes', 'trips', 'trip_assets');
```

预期：四张表的 `rowsecurity` 都是 `true`。

- [ ] **步骤 6：提交**

运行：

```bash
git add supabase/migrations/20260509000000_travel_collab_core.sql supabase/seed.sql
git commit -m "添加旅行共写小站 Supabase 数据结构"
```

---

## 任务 3：添加 Supabase 客户端、认证工具和基础测试

**文件：**
- 创建：`src/lib/env.ts`
- 创建：`src/lib/supabase/server.ts`
- 创建：`src/lib/supabase/browser.ts`
- 创建：`src/lib/roles.ts`
- 创建：`src/lib/roles.test.ts`
- 创建：`src/lib/slug.ts`
- 创建：`src/lib/slug.test.ts`
- 创建：`src/lib/assets.ts`
- 创建：`src/lib/assets.test.ts`
- 创建：`src/lib/auth.ts`

- [ ] **步骤 1：添加环境变量工具**

创建 `src/lib/env.ts`：

```ts
export function getSupabaseEnv() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("缺少 PUBLIC_SUPABASE_URL 或 PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return { url, publishableKey };
}
```

- [ ] **步骤 2：添加服务端 Supabase client**

创建 `src/lib/supabase/server.ts`：

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

- [ ] **步骤 3：添加浏览器 Supabase client**

创建 `src/lib/supabase/browser.ts`：

```ts
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "../env";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient(url, publishableKey);
}
```

- [ ] **步骤 4：添加角色工具和测试**

创建 `src/lib/roles.ts`：

```ts
export type UserRole = "admin" | "author" | "reader";

export function isAdmin(role: UserRole | null | undefined) {
  return role === "admin";
}

export function canWriteTrips(role: UserRole | null | undefined) {
  return role === "admin" || role === "author";
}
```

创建 `src/lib/roles.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { canWriteTrips, isAdmin } from "./roles";

describe("角色工具", () => {
  it("可以识别管理员", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("author")).toBe(false);
  });

  it("允许管理员和作者写游记", () => {
    expect(canWriteTrips("admin")).toBe(true);
    expect(canWriteTrips("author")).toBe(true);
    expect(canWriteTrips("reader")).toBe(false);
  });
});
```

- [ ] **步骤 5：添加 slug 工具和测试**

创建 `src/lib/slug.ts`：

```ts
export function slugify(input: string) {
  const ascii = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return ascii || `trip-${Date.now()}`;
}
```

创建 `src/lib/slug.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("可以生成英文 URL slug", () => {
    expect(slugify("A Trip to Shanghai!")).toBe("a-trip-to-shanghai");
  });

  it("中文标题会生成备用 slug", () => {
    expect(slugify("第一次出发")).toMatch(/^trip-\d+$/);
  });
});
```

- [ ] **步骤 6：添加图片路径工具和测试**

创建 `src/lib/assets.ts`：

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

创建 `src/lib/assets.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { buildTripImagePath } from "./assets";

describe("图片路径工具", () => {
  it("把图片放在用户和游记目录下", () => {
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

- [ ] **步骤 7：添加认证工具**

创建 `src/lib/auth.ts`：

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role, map_color")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile };
}

export function redirectToLogin(request: Request) {
  const url = new URL(request.url);
  return `/auth/login?next=${encodeURIComponent(url.pathname)}`;
}
```

- [ ] **步骤 8：运行测试**

运行：

```bash
npm run test
```

预期：角色、slug、图片路径测试全部通过。

- [ ] **步骤 9：提交**

运行：

```bash
git add src/lib vitest.config.ts package.json package-lock.json
git commit -m "添加 Supabase 客户端与基础工具"
```

---

## 任务 4：添加布局和共享导航

**文件：**
- 创建：`src/layouts/BaseLayout.astro`
- 创建：`src/layouts/DashboardLayout.astro`
- 修改：`src/styles/global.css`

- [ ] **步骤 1：添加公共布局**

创建 `src/layouts/BaseLayout.astro`：

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

- [ ] **步骤 2：添加后台布局**

创建 `src/layouts/DashboardLayout.astro`：

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

- [ ] **步骤 3：添加布局样式**

追加到 `src/styles/global.css`：

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
```

- [ ] **步骤 4：验证**

运行：

```bash
npm run check
```

预期：类型检查通过。

- [ ] **步骤 5：提交**

运行：

```bash
git add src/layouts src/styles/global.css
git commit -m "添加旅行共写小站布局"
```

---

## 任务 5：实现注册、登录和退出

**文件：**
- 创建：`src/pages/auth/register.astro`
- 创建：`src/pages/auth/login.astro`
- 创建：`src/pages/auth/logout.ts`

- [ ] **步骤 1：创建注册页**

注册页必须包含昵称、邮箱、密码和邀请码。提交时调用 `consume_invite_code`，再创建 Auth 用户和 `profiles` 记录。邀请码无效时显示中文错误。

- [ ] **步骤 2：创建登录页**

登录页使用邮箱和密码调用 `supabase.auth.signInWithPassword`。登录成功后跳转到 `next` 参数或 `/dashboard/`。

- [ ] **步骤 3：创建退出接口**

`src/pages/auth/logout.ts` 调用 `supabase.auth.signOut()`，然后重定向到首页。

- [ ] **步骤 4：手动验证认证流程**

配置 Supabase 环境变量并执行迁移后：

```text
访问 /auth/register/
使用邀请码 FRIENDS-TRAVEL-2026 注册
确认跳转到 /dashboard/
访问 /auth/logout/
再从 /auth/login/ 登录
```

预期：注册、退出、登录均可完成。

- [ ] **步骤 5：提交**

运行：

```bash
git add src/pages/auth
git commit -m "实现邀请码注册与登录退出"
```

---

## 任务 6：实现 Dashboard 和游记编辑器

**文件：**
- 创建：`src/lib/trips.ts`
- 创建：`src/components/trips/TripForm.astro`
- 创建：`src/components/trips/TripCard.astro`
- 创建：`src/pages/dashboard/index.astro`
- 创建：`src/pages/dashboard/trips/new.astro`
- 创建：`src/pages/dashboard/trips/[id]/edit.astro`

- [ ] **步骤 1：添加游记表单标准化工具**

`src/lib/trips.ts` 负责把 `FormData` 转为 `trips` 表可写入的数据，包含标题、摘要、正文、旅行日期、地点、省份、城市、可选经纬度和状态。

- [ ] **步骤 2：添加游记卡片组件**

`TripCard.astro` 同时支持公开列表和后台列表。后台模式链接到编辑页，公开模式链接到详情页。

- [ ] **步骤 3：添加游记表单组件**

`TripForm.astro` 使用普通表单和文本区域，不做复杂富文本。状态下拉包含“保存草稿”和“直接发布”。

- [ ] **步骤 4：添加我的游记列表**

`/dashboard/` 必须要求登录。未登录跳转 `/auth/login/`。登录后只列出当前用户自己的游记。

- [ ] **步骤 5：添加新建游记页**

`/dashboard/trips/new/` 提交后写入 `trips`，作者为当前登录用户。保存成功后跳转 `/dashboard/`。

- [ ] **步骤 6：添加编辑游记页**

`/dashboard/trips/[id]/edit/` 加载当前用户可访问的游记。提交后更新该游记。RLS 负责阻止作者编辑别人的游记。

- [ ] **步骤 7：验证**

运行：

```bash
npm run check
npm run build
```

预期：两个命令都成功。手动新建草稿和已发布游记各一篇。

- [ ] **步骤 8：提交**

运行：

```bash
git add src/lib/trips.ts src/components/trips src/pages/dashboard
git commit -m "实现游记后台与编辑器"
```

---

## 任务 7：实现图片压缩上传

**文件：**
- 创建：`src/lib/image-compression.ts`
- 创建：`src/components/trips/ImageUploader.astro`
- 修改：`src/pages/dashboard/trips/[id]/edit.astro`

- [ ] **步骤 1：添加图片压缩工具**

`src/lib/image-compression.ts` 使用 `browser-image-compression`，最长边 1600px，目标 0.5MB，输出 WebP。

- [ ] **步骤 2：添加上传组件**

`ImageUploader.astro` 读取图片文件，压缩后上传到 Supabase Storage 的 `trip-images/{user_id}/{trip_id}/{image_id}.webp`，并在 `trip_assets` 写入元数据。

- [ ] **步骤 3：接入编辑页**

在游记编辑页渲染 `ImageUploader`。只在已有游记的编辑页上传图片，新建页先保存游记再上传图片。

- [ ] **步骤 4：手动验证**

```text
打开一篇游记的编辑页
上传一张大于 1MB 的 JPEG
确认 Storage 中出现 WebP
确认 trip_assets 出现记录
确认 size_bytes 小于等于 1000000
```

- [ ] **步骤 5：提交**

运行：

```bash
git add src/lib/image-compression.ts src/components/trips/ImageUploader.astro src/pages/dashboard/trips
git commit -m "实现游记图片压缩上传"
```

---

## 任务 8：实现公开游记列表和详情页

**文件：**
- 创建：`src/pages/trips/index.astro`
- 替换：`src/pages/trips/[slug].astro`
- 修改：`src/pages/index.astro`

- [ ] **步骤 1：创建公开游记列表**

`/trips/` 查询 `status = 'published'` 的游记，按 `published_at` 倒序展示。

- [ ] **步骤 2：替换公开详情页**

`/trips/[slug]/` 查询一篇已发布游记和关联图片。草稿或不存在的 slug 返回 404。

- [ ] **步骤 3：更新首页**

首页改为查询最新三篇已发布游记，并提供游记列表和足迹图入口。

- [ ] **步骤 4：验证**

```text
/trips/ 只显示已发布游记
/trips/[slug]/ 可以打开已发布游记
草稿不会出现在公开页面
```

运行：

```bash
npm run check
npm run build
```

- [ ] **步骤 5：提交**

运行：

```bash
git add src/pages/index.astro src/pages/trips
git commit -m "实现公开游记列表和详情"
```

---

## 任务 9：实现中国城市足迹图

**文件：**
- 创建：`src/data/china-city-coordinates.ts`
- 创建：`public/maps/china-provinces.geo.json`
- 创建：`src/lib/map-data.ts`
- 创建：`src/components/maps/FootprintMap.astro`
- 创建：`src/pages/footprints.astro`
- 修改：`src/styles/global.css`

- [ ] **步骤 1：添加城市坐标数据**

创建 `src/data/china-city-coordinates.ts`，第一版先包含常见城市：

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

- [ ] **步骤 2：添加地图数据占位文件**

创建 `public/maps/china-provinces.geo.json`：

```json
{
  "type": "FeatureCollection",
  "features": []
}
```

第一版可见轮廓由 `FootprintMap.astro` 中的轻量 SVG 绘制。这个 GeoJSON 文件用于后续替换为真实简化省界数据。

- [ ] **步骤 3：添加足迹聚合工具**

`src/lib/map-data.ts` 按城市聚合已发布游记，并从 `cityCoordinates` 中取点位。找不到点位的城市使用地图中心备用点。

- [ ] **步骤 4：添加足迹图组件**

`FootprintMap.astro` 使用 SVG 绘制中国轮廓和城市圆点。圆点颜色来自作者的 `profiles.map_color`。点击城市卡片进入对应游记。

- [ ] **步骤 5：创建足迹图页面**

`/footprints/` 查询已发布游记和作者资料，渲染 `FootprintMap`。

- [ ] **步骤 6：验证**

```text
已发布游记城市出现在足迹图
不同作者显示不同颜色
草稿不会出现在足迹图
```

- [ ] **步骤 7：提交**

运行：

```bash
git add src/data src/lib/map-data.ts src/components/maps src/pages/footprints.astro public/maps src/styles/global.css
git commit -m "实现中国城市足迹图"
```

---

## 任务 10：实现管理员后台

**文件：**
- 创建：`src/pages/admin/index.astro`
- 创建：`src/pages/admin/invites.astro`
- 创建：`src/pages/admin/users.astro`
- 创建：`src/pages/admin/trips.astro`

- [ ] **步骤 1：添加管理员保护**

每个 `/admin/` 页面都先调用 `getSessionProfile`。未登录跳转登录页；不是 `admin` 则跳转 `/dashboard/`。

- [ ] **步骤 2：添加管理员入口**

`/admin/` 显示三个入口：邀请码管理、用户管理、全部游记管理。

- [ ] **步骤 3：添加邀请码管理**

`/admin/invites/` 支持生成新邀请码。新邀请码默认 `role_to_grant = 'author'`、`max_uses = 10`。页面展示邀请码、已使用次数、最大次数和是否启用。

- [ ] **步骤 4：添加用户管理**

`/admin/users/` 展示用户昵称、角色、地图颜色。管理员可以修改 `role` 和 `map_color`。

- [ ] **步骤 5：添加全部游记管理**

`/admin/trips/` 展示所有游记、作者、状态、城市和编辑入口。管理员编辑复用游记编辑页，RLS 允许 admin 更新所有游记。

- [ ] **步骤 6：验证**

```text
author 访问 /admin/ 会跳回 /dashboard/
admin 可以创建邀请码
admin 可以修改用户地图颜色
admin 可以看到全部游记
```

- [ ] **步骤 7：提交**

运行：

```bash
git add src/pages/admin
git commit -m "实现管理员后台"
```

---

## 任务 11：优化首页视觉并加入生成素材

**文件：**
- 创建：`public/images/travel-collab-hero.svg`
- 修改：`src/pages/index.astro`
- 修改：`src/styles/global.css`

- [ ] **步骤 1：创建首页背景图**

创建 `public/images/travel-collab-hero.svg`：

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

- [ ] **步骤 2：更新首页首屏**

首页首屏使用 `/images/travel-collab-hero.svg`，文案围绕“旅行共写小站”和朋友共同记录足迹展开。

- [ ] **步骤 3：验证视觉**

运行：

```bash
npm run build
```

打开 `http://127.0.0.1:4321/`，确认首屏图片加载、导航不换行错乱、移动端没有文字重叠。

- [ ] **步骤 4：提交**

运行：

```bash
git add public/images/travel-collab-hero.svg src/pages/index.astro src/styles/global.css
git commit -m "优化旅行共写小站首页视觉"
```

---

## 任务 12：补充 Cloudflare Pages 部署说明

**文件：**
- 修改：`README.md`
- 创建：`docs/deploy-cloudflare-pages.md`

- [ ] **步骤 1：创建部署说明**

创建 `docs/deploy-cloudflare-pages.md`：

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

- [ ] **步骤 2：更新 README**

在 `README.md` 增加：

```md
## 部署

项目使用 Cloudflare Pages 部署。构建命令为 `npm run build`，输出目录为 `dist`。

部署前需要在 Cloudflare Pages 中配置：

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`

详细步骤见 `docs/deploy-cloudflare-pages.md`。
```

- [ ] **步骤 3：最终验证**

运行：

```bash
npm run test
npm run check
npm run build
```

预期：三个命令都通过。

- [ ] **步骤 4：提交**

运行：

```bash
git add README.md docs/deploy-cloudflare-pages.md
git commit -m "补充 Cloudflare Pages 部署说明"
```

---

## 任务 13：端到端验收

**文件：**
- 只有发现验收问题时才修改相关文件。

- [ ] **步骤 1：确认管理员账号**

在 Supabase Auth 创建第一个用户，然后运行 `supabase/seed.sql`，把邮箱替换为管理员邮箱。

预期：该用户的 `profiles.role` 为 `admin`。

- [ ] **步骤 2：创建邀请码**

以管理员登录 `/admin/invites/`，创建一个新邀请码。

预期：邀请码 `max_uses = 10`，`used_count = 0`。

- [ ] **步骤 3：注册作者**

在无登录状态下打开 `/auth/register/`，使用邀请码注册。

预期：新用户角色为 `author`，邀请码使用次数增加到 `1`。

- [ ] **步骤 4：创建并发布游记**

以作者身份打开 `/dashboard/trips/new/`，填写标题、摘要、正文、日期、省份、城市和地点，状态选择“直接发布”。

预期：保存后返回后台列表，游记显示为“已发布”。

- [ ] **步骤 5：上传图片**

打开该游记编辑页，上传一张图片。

预期：图片被压缩后进入 Supabase Storage，并在 `trip_assets` 中有记录。

- [ ] **步骤 6：验证公开页面**

打开：

```text
/trips/
/trips/[slug]/
/footprints/
```

预期：已发布游记在列表、详情和足迹图中都可见。

- [ ] **步骤 7：验证 RLS**

用另一个作者账号尝试访问第一位作者的编辑页。

预期：页面不暴露可编辑内容，或更新被 RLS 阻止。

- [ ] **步骤 8：按需提交修复**

如果验收过程中修复了问题，运行：

```bash
git add .
git commit -m "修复旅行共写小站验收问题"
```

如果没有修复，不创建空提交。

---

## 自检清单

- [ ] 注册必须填写邀请码。
- [ ] 邀请码最多可用 10 次。
- [ ] 只有管理员能生成邀请码和修改角色。
- [ ] 作者可以直接发布自己的游记。
- [ ] 草稿不出现在公开列表、详情和足迹图。
- [ ] 图片上传前压缩，不保存原图。
- [ ] 所有公开 schema 表都启用 RLS。
- [ ] 对 Supabase Data API 暴露的表显式配置 grant。
- [ ] Cloudflare Pages 不配置 service role key。
- [ ] `npm run test`、`npm run check`、`npm run build` 通过。
