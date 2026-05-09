# travel_blog

一个从内容优先开始的旅行博客。第一版使用 Astro 和 Markdown 编写游记，后续会逐步加入照片墙、目的地专题、地图和行程功能。

## 本地运行

```bash
npm install
npm run dev
```

## 写一篇游记

在 `src/content/trips` 下新增 Markdown 文件，并填写标题、日期、目的地、摘要、标签和可选坐标。

示例：

```md
---
title: "一次新的出发"
date: "2026-05-09"
destination: "目的地名称"
summary: "用一句话概括这段旅程。"
heroImage: "/images/example.svg"
tags:
  - 游记
coordinates:
  lat: 31.2304
  lng: 121.4737
---

这里写正文。
```

## 常用命令

- `npm run dev`：启动开发服务器。
- `npm run check`：运行 Astro 类型检查。
- `npm run build`：生成生产构建。
- `npm run preview`：预览生产构建。

## 部署

项目使用 Cloudflare Pages 部署。构建命令为 `npm run build`，输出目录为 `dist`。

部署前需要在 Cloudflare Pages 中配置：

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`

部署前还需要先执行 Supabase migration，并准备管理员或邀请码账号。

详细步骤见 [docs/deploy-cloudflare-pages.md](docs/deploy-cloudflare-pages.md)。

## 项目约定

所有文档、代码注释和 Git 提交信息均使用中文。
