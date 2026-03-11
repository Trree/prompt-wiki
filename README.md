# Prompt / Skill / Workflow System

最小 starter 骨架，遵循当前 PRD：

- `Markdown` 作为正文内容源
- `Directus` 作为元数据与关系管理层
- `Next.js` 作为前台展示层
- `SQLite` 作为 MVP 默认数据库

## 目录结构

```txt
apps/
  cms/
  web/
content/
  prompts/
  skills/
  workflows/
scripts/
data/
```

## 当前状态

当前仓库先完成三件事：

1. 固定内容目录结构
2. 提供示例 Markdown 内容
3. 提供一个本地可运行的内容索引脚本
4. 提供一个同步到 Directus 的脚本骨架

## 可用命令

```bash
npm run content:index
npm run content:check
npm run directus:sync
npm run directus:sync:apply
```

说明：

- `content:index` 会扫描 `content/` 并生成索引文件
- `content:check` 会校验 frontmatter 必填字段
- `directus:sync` 会干跑同步流程
- `directus:sync:apply` 会把索引中的元数据同步到 Directus

生成文件位置：

```txt
content/.generated/index.json
```

## 运行前提

- Node.js 18+

说明：

- `scripts/sync-content-to-directus.mjs` 使用了 Node 原生 `fetch`

## 下一步建议

1. 在 `apps/cms` 初始化 Directus，并将数据库配置为 SQLite
2. 在 Directus 中创建 `entries/tags/entries_tags/entry_relations`
3. 配置 `DIRECTUS_URL` 和 `DIRECTUS_TOKEN`
4. 执行实际同步
5. 让 `apps/web` 从 Directus 读取元数据
