# Web App

这个目录现在已经包含一个最小 Next.js 骨架。

当前实现：

- 首页
- `/prompts`
- `/skills`
- `/workflows`
- `/[type]/[slug]`

当前数据源：

- 正文：`content/.generated/index.json`
- 元数据：Directus API，如果不可用则回退本地索引

也就是：

- 正文来自 Markdown
- 标签、状态、owner、relations 优先读 Directus
- Directus 不可用时页面仍可降级运行

## 启动前提

先在仓库根目录生成内容索引：

```bash
npm run content:index
```

再安装前端依赖并启动：

```bash
cd apps/web
npm install
npm run dev
```

如果要启用 Directus 元数据，先配置：

```bash
cp .env.example .env.local
```

然后填入：

- `DIRECTUS_URL`
- `DIRECTUS_TOKEN`

## 后续接入 Directus

当前版本已经是双源模式：

1. 正文固定来自 Markdown
2. 元数据优先来自 Directus
3. 关系优先来自 `entry_relations`
