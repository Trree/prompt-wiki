# Directus App

这个目录保留给 Directus CMS。

MVP 约束：

- 数据库使用 `SQLite`
- 正文不存 Directus，只存元数据、标签、关系
- 数据入口以 `content/` 下的 Markdown 为准

建议环境变量：

```env
DB_CLIENT=sqlite3
DB_FILENAME=../../data/directus.db
KEY=replace-with-random-key
SECRET=replace-with-random-secret
PUBLIC_URL=http://localhost:8055
```

后续实现目标：

- 创建 `entries`
- 创建 `tags`
- 创建 `entry_relations`
- 提供只读 API 给 `apps/web`

## 当前仓库已提供

- Schema 说明：[directus-schema-mvp.md](/root/workspace/codex/prompt/apps/cms/directus-schema-mvp.md)
- SQLite 配置说明：[sqlite-setup.md](/root/workspace/codex/prompt/apps/cms/sqlite-setup.md)
- 同步脚本：[scripts/sync-content-to-directus.mjs](/root/workspace/codex/prompt/scripts/sync-content-to-directus.mjs)

## 推荐初始化顺序

1. 按 `.env.example` 配好 SQLite
2. 初始化并启动 Directus
3. 按 `directus-schema-mvp.md` 创建集合
4. 在仓库根目录执行 `npm run content:index`
5. 先执行 `node scripts/sync-content-to-directus.mjs --dry-run`
6. 再设置 `DIRECTUS_URL` 和 `DIRECTUS_TOKEN` 执行实际同步

## 同步脚本约束

MVP 同步内容：

- `entries`
- `tags`
- `entries_tags`
- `entry_relations`

不同步内容：

- 正文 Markdown
- 富文本渲染结果
- 示例子表
