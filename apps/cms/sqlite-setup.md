# SQLite Setup For Directus

MVP 默认数据库是 `SQLite`。

目标：

- 跨平台
- 本地开发零额外数据库依赖
- 部署尽量简单

## 文件位置

推荐数据库文件：

```txt
data/directus.db
```

这个路径已经在 [apps/cms/.env.example](/root/workspace/codex/prompt/apps/cms/.env.example) 中预留。

## 环境变量

```env
DB_CLIENT=sqlite3
DB_FILENAME=../../data/directus.db
KEY=replace-with-random-key
SECRET=replace-with-random-secret
PUBLIC_URL=http://localhost:8055
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me
```

## 本地初始化建议

1. 在 `apps/cms` 内初始化 Directus 项目
2. 复制 `.env.example` 为 `.env`
3. 首次启动时让 Directus 自动创建 SQLite 数据库文件
4. 登录后台后按 `directus-schema-mvp.md` 创建集合

## Docker 部署建议

最小部署可使用：

- 一个 `Directus` 容器
- 一个挂载卷，用于持久化 `data/directus.db`

关键点：

- 必须挂载数据库文件目录
- 不要把 SQLite 文件放到容器临时层

## 迁移到 Postgres 的边界

以下情况出现后，应优先迁移：

- 多人频繁在后台编辑
- 正式生产环境开始承载稳定访问
- 需要更复杂的查询、审计或备份策略
- 需要多实例部署

迁移前提：

- 保持 `entries/tags/entries_tags/entry_relations` 的字段语义稳定
- 同步脚本只依赖 Directus API，不依赖底层数据库能力

