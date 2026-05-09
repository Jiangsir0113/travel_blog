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

## 部署前准备

先在 Supabase 项目中执行 `supabase/migrations/20260509000000_travel_collab_core.sql`，创建表、RLS policy、RPC 和私有 `trip-images` Storage bucket。

创建第一个 Auth 用户后，再按 `supabase/seed.sql` 初始化管理员资料和默认邀请码。后续作者账号需要通过邀请码注册，或由管理员在后台生成新的邀请码。

## 部署后验证

1. 打开首页。
2. 打开 `/trips/`。
3. 打开 `/auth/login/`。
4. 使用已通过邀请码创建的作者账号登录。
5. 新建一篇草稿。
6. 发布游记。
7. 确认 `/footprints/` 出现对应城市点位。
