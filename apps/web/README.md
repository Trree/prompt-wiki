# Web App

基于 Next.js 的 Prompt / Skill / Workflow 展示前端。

## 当前实现

- 首页：概览
- 列表页：`/prompts`, `/skills`, `/workflows`
- 详情页：`/[type]/[slug]`

## 数据源

- 完全基于本地文件系统生成的 `content/.generated/index.json`。

## 启动前提

1. 在仓库根目录生成内容索引：
   ```bash
   npm run content:index
   ```

2. 安装依赖并启动：
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

## Owner Token

- 设置 `OWNER_TOKEN` 环境变量后，除 `/public` 外的页面和内部 API 都需要先在 `/auth` 登录。
- `/public` 下的页面始终可公开访问。
