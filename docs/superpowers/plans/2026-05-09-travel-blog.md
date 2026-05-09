# 旅行博客初始化实施计划

> **给执行代理的要求：** 按任务逐步执行本计划。推荐使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans`。步骤使用复选框语法追踪进度。

**目标：** 将当前空项目初始化为名为 `travel_blog` 的公开旅行博客仓库，第一版采用 Astro 静态站点和 Markdown 游记内容集合。

**架构：** 项目使用 Astro 输出静态页面，`src/content/trips` 负责游记内容，`src/pages` 负责首页、游记详情和目的地入口。第一版不引入后端或数据库，只保留清晰的数据字段和目录边界，方便后续加入照片墙、地图、搜索和行程工具。

**技术栈：** Astro、TypeScript、Markdown/MDX、Git、GitHub CLI 或 GitHub 插件。

---

### 任务 1：整理本地项目与基础约定

**文件：**
- 修改：项目目录 `/mnt/e/Codex_Project/personal_blog`，最终改名为 `/mnt/e/Codex_Project/travel_blog`
- 创建：`.gitignore`
- 创建：`.editorconfig`
- 修改：`docs/superpowers/specs/2026-05-09-travel-blog-design.md`
- 创建：`docs/superpowers/plans/2026-05-09-travel-blog.md`

- [ ] **步骤 1：确认当前 git 状态干净**

运行：

```bash
git status --short --branch
```

预期：只出现计划文件新增，或工作区在提交后为干净状态。

- [ ] **步骤 2：创建基础忽略规则**

写入 `.gitignore`：

```gitignore
node_modules/
dist/
.astro/
.env
.env.*
!.env.example
.DS_Store
.superpowers/
```

- [ ] **步骤 3：创建编辑器约定**

写入 `.editorconfig`：

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

- [ ] **步骤 4：提交基础约定**

运行：

```bash
git add .gitignore .editorconfig docs/superpowers/plans/2026-05-09-travel-blog.md
git commit -m "添加项目初始化计划与基础约定"
```

预期：生成一条中文提交。

### 任务 2：初始化 Astro 项目骨架

**文件：**
- 创建：`package.json`
- 创建：`astro.config.mjs`
- 创建：`tsconfig.json`
- 创建：`src/env.d.ts`
- 创建：`src/content/config.ts`
- 创建：`src/content/trips/sample-trip.md`
- 创建：`src/pages/index.astro`
- 创建：`src/pages/trips/[slug].astro`
- 创建：`src/pages/destinations/index.astro`
- 创建：`src/styles/global.css`
- 创建：`public/images/.gitkeep`

- [ ] **步骤 1：写入 package.json**

内容：

```json
{
  "name": "travel_blog",
  "type": "module",
  "version": "0.1.0",
  "private": false,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check"
  },
  "dependencies": {
    "@astrojs/check": "^0.9.4",
    "astro": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **步骤 2：写入 Astro 配置**

内容：

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://example.com",
});
```

- [ ] **步骤 3：写入 TypeScript 配置**

内容：

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": "."
  }
}
```

- [ ] **步骤 4：写入 Astro 环境声明**

内容：

```ts
/// <reference types="astro/client" />
```

- [ ] **步骤 5：写入游记内容集合配置**

内容：

```ts
import { defineCollection, z } from "astro:content";

const trips = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    destination: z.string(),
    summary: z.string(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
  }),
});

export const collections = { trips };
```

- [ ] **步骤 6：写入示例游记**

内容：

```md
---
title: "第一次出发"
date: "2026-05-09"
destination: "待定目的地"
summary: "这是一篇示例游记，用来验证博客的内容结构、首页列表和详情页渲染。"
heroImage: "/images/sample-trip.jpg"
tags:
  - 游记
  - 计划
coordinates:
  lat: 31.2304
  lng: 121.4737
---

这是一篇示例游记。之后可以把这里替换成真实旅程中的路线、照片、交通、住宿和当时的心情。

第一版先关注写作体验：用 Markdown 记录旅程，用清晰的字段管理目的地、日期、标签和未来地图功能需要的坐标。
```

- [ ] **步骤 7：写入全局样式**

内容：创建冷静、清晰、适合旅行内容阅读的样式，不使用单一色系堆叠，不加入不必要的装饰背景。

- [ ] **步骤 8：写入首页**

内容：首页读取 `trips` 内容集合，展示首屏介绍、最近游记、目的地入口和照片预览区域。

- [ ] **步骤 9：写入游记详情页**

内容：使用 `getCollection("trips")` 生成静态路由，渲染标题、目的地、日期、标签、摘要和正文。

- [ ] **步骤 10：写入目的地入口页**

内容：从游记集合中提取目的地，展示目的地名称、文章数量和最近一篇游记摘要。

- [ ] **步骤 11：提交 Astro 骨架**

运行：

```bash
git add package.json astro.config.mjs tsconfig.json src public
git commit -m "初始化旅行博客 Astro 骨架"
```

预期：生成一条中文提交。

### 任务 3：补充中文文档

**文件：**
- 创建：`README.md`
- 创建：`.env.example`

- [ ] **步骤 1：写入 README**

README 使用中文，包含：

````md
# travel_blog

一个从内容优先开始的旅行博客。第一版使用 Astro 和 Markdown 编写游记，后续会逐步加入照片墙、目的地专题、地图和行程功能。

## 本地运行

```bash
npm install
npm run dev
```

## 写一篇游记

在 `src/content/trips` 下新增 Markdown 文件，并填写标题、日期、目的地、摘要、标签和可选坐标。

## 常用命令

- `npm run dev`：启动开发服务器。
- `npm run build`：生成生产构建。
- `npm run preview`：预览生产构建。

## 项目约定

所有文档、代码注释和 Git 提交信息均使用中文。
````

- [ ] **步骤 2：写入 .env.example**

内容：

```bash
# 当前第一版不需要环境变量。
```

- [ ] **步骤 3：提交中文文档**

运行：

```bash
git add README.md .env.example
git commit -m "补充旅行博客中文文档"
```

预期：生成一条中文提交。

### 任务 4：安装依赖并验证站点

**文件：**
- 创建：`package-lock.json`

- [ ] **步骤 1：安装依赖**

运行：

```bash
npm install
```

预期：生成 `package-lock.json`，依赖安装成功。

- [ ] **步骤 2：运行 Astro 检查**

运行：

```bash
npm run check
```

预期：类型检查通过。

- [ ] **步骤 3：运行生产构建**

运行：

```bash
npm run build
```

预期：`dist/` 构建成功。

- [ ] **步骤 4：提交锁文件**

运行：

```bash
git add package-lock.json
git commit -m "锁定旅行博客依赖版本"
```

预期：生成一条中文提交。

### 任务 5：创建 GitHub 仓库并推送

**文件：**
- 修改：本地 git remote 配置

- [ ] **步骤 1：将本地目录改名为 travel_blog**

从父目录执行：

```bash
mv /mnt/e/Codex_Project/personal_blog /mnt/e/Codex_Project/travel_blog
```

预期：项目目录变为 `/mnt/e/Codex_Project/travel_blog`。

- [ ] **步骤 2：创建公开 GitHub 仓库**

优先使用 GitHub CLI：

```bash
gh repo create travel_blog --public --source=. --remote=origin --push
```

预期：GitHub 上出现公开仓库 `travel_blog`，本地 `origin` 指向该仓库，并推送 `main` 分支。

- [ ] **步骤 3：确认远程仓库**

运行：

```bash
git remote -v
git status --short --branch
```

预期：`origin` 存在，当前分支为 `main`，工作区干净。

### 任务 6：启动开发服务器供本地预览

**文件：**
- 不修改文件

- [ ] **步骤 1：启动开发服务器**

运行：

```bash
npm run dev -- --host 0.0.0.0
```

预期：终端输出本地预览地址。

- [ ] **步骤 2：告知用户预览地址**

回复中包含：

```text
本地预览地址：http://localhost:4321
```

如果端口被占用，则使用 Astro 输出的实际端口。

---

## 自检

- 设计 spec 中的仓库名、目录名、公开仓库、Astro、Markdown 游记、后续照片墙和地图扩展，均有对应任务。
- 文档、注释和提交信息均要求使用中文。
- 第一版没有引入登录、数据库、评论、CMS、高级地图或完整行程规划器。
- 验证步骤包含依赖安装、类型检查、生产构建、本地预览和远程仓库确认。
