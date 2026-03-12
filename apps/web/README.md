# Web App

基于 Next.js 的 Prompt / Agent / Skill 展示前端。

## 当前实现

- 首页：概览
- 列表页：`/prompts`, `/agents`, `/skills`
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

- 在仓库根目录 `config.json` 中设置非空 `OWNER_TOKEN` 后，除 `/public` 外的页面和内部 API 会启用权限控制。
- `OWNER_TOKEN` 未配置或为空字符串时，默认开放所有页面和内部 API，方便别人直接使用。
- `/public` 下的页面始终可公开访问。
