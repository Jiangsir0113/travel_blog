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

先在 Supabase 项目中按文件名顺序执行 `supabase/migrations/` 下的 migration，创建表、RLS policy、RPC、私有 `trip-images` Storage bucket，以及用户名登录所需字段。

创建第一个 Auth 用户后，再按 `supabase/seed.sql` 初始化管理员资料和一个随机默认邀请码。脚本会把最早创建的 Auth 用户提升为管理员；运行后在 Supabase SQL Editor 查询 `public.invite_codes` 获取随机邀请码。后续作者账号需要通过邀请码注册，或由管理员在后台生成新的邀请码。

为了让朋友可以直接用“用户名 + 密码 + 邀请码”注册，需要在 Supabase Dashboard 的 `Authentication > Providers > Email` 里关闭 `Confirm email`。本项目不会在 Cloudflare Pages 配置 `service_role` key，所以注册后必须立即拿到用户会话才能安全创建资料并消耗邀请码。

## 部署后验证

1. 打开首页。
2. 打开 `/trips/`。
3. 打开 `/auth/login/`。
4. 使用已通过邀请码创建的作者用户名登录。
5. 新建一篇草稿。
6. 发布游记。
7. 确认 `/footprints/` 出现对应城市点位。
