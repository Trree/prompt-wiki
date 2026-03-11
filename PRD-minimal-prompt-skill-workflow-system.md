# PRD: Prompt / Skill / Workflow 管理系统（最简实现）

## 1. 项目目标

基于 `Directus + Next.js + Markdown` 构建一个长期可进化的管理系统，用来统一管理：

- Prompt
- Skill
- Workflow

系统第一阶段只解决三个核心问题：

1. 内容能被结构化存储和检索
2. 内容能被版本化维护
3. 内容能被清晰展示和使用

原则：`先可用，再扩展；先内容，再编排；先简单，再自动化。`

---

## 2. 背景与问题

当前 Prompt / Skill / Workflow 往往分散在：

- Markdown 文件
- 文档工具
- 聊天记录
- 脚本目录

导致的问题：

- 不知道最新版本在哪里
- 很难按标签、用途、模型、输入输出要求检索
- Workflow 和 Prompt/Skill 的关系不清晰
- 内容可以写，但难以管理和复用

本项目的最简目标不是做“复杂 AI 平台”，而是先做一个“可维护的知识与执行说明库”。

---

## 3. 产品目标

### 3.1 MVP 目标

提供一个最小闭环：

- 用 Markdown 编写 Prompt / Skill / Workflow 正文
- 用 Directus 管理元数据、关系、状态
- 用 Next.js 提供浏览、搜索、详情页
- 支持从 Git 仓库读取 Markdown 内容

### 3.2 非目标

本期不做：

- 在线 Prompt 运行沙盒
- 复杂工作流编排引擎
- 细粒度 RBAC 设计
- 实时协作编辑
- 审批流
- 向量数据库和 RAG
- 自动评测系统

---

## 4. 目标用户

### 4.1 核心用户

- AI 产品/工程团队
- Prompt Engineer
- 内容运营或知识库维护者

### 4.2 使用场景

- 查找一个可复用 Prompt
- 查看某个 Skill 的用途、输入、依赖和示例
- 查看某个 Workflow 由哪些步骤组成、依赖哪些 Prompt / Skill
- 按标签、模型、场景筛选内容

---

## 5. 产品范围

MVP 只包含 3 类核心对象：

1. Prompt
2. Skill
3. Workflow

每类对象都有两部分：

- Markdown 正文：适合版本控制、评审、迁移
- Directus 元数据：适合筛选、关系管理、后台编辑

---

## 6. 信息架构

### 6.1 内容源策略

采用“`Markdown 为主，Directus 为辅`”：

- Markdown 保存正文和可读内容
- Directus 保存元数据、关系、发布状态

原因：

- Markdown 适合 Git 管理和长期演化
- Directus 擅长内容建模、后台管理、API 输出
- 二者结合可以避免把正文锁死在 CMS 里

### 6.2 推荐目录结构

```txt
/content
  /prompts
    summarize-article.md
    classify-ticket.md
  /skills
    x-post-writer.md
    article-illustrator.md
  /workflows
    publish-article.md
    research-to-post.md
```

### 6.3 Markdown Frontmatter

每个 Markdown 文件包含最小 frontmatter：

```yaml
id: summarize-article
type: prompt
title: 文章摘要助手
slug: summarize-article
status: active
tags:
  - summarization
owner: team-ai
model:
  - gpt-4.1
summary: 用于将长文压缩为结构化摘要
```

正文部分保存：

- 适用场景
- 输入要求
- 输出格式
- 示例
- 注意事项

---

## 7. 数据模型

Directus 建 4 张核心集合即可。

### 7.1 `entries`

统一承载 Prompt / Skill / Workflow 的元数据。

字段：

- `id`：字符串，和 Markdown frontmatter `id` 对齐
- `type`：枚举，`prompt | skill | workflow`
- `title`
- `slug`
- `summary`
- `status`：`draft | active | archived`
- `owner`
- `source_path`：对应 Markdown 路径
- `version`：手动版本号，先用字符串
- `models`：多值字符串
- `tags`：多对多
- `updated_at`

### 7.2 `tags`

字段：

- `id`
- `name`
- `slug`

### 7.3 `entry_relations`

用来表达对象之间的关系。

字段：

- `id`
- `from_entry`
- `to_entry`
- `relation_type`

`relation_type` 示例：

- `uses`
- `depends_on`
- `part_of`
- `derived_from`

### 7.4 `entry_examples`

只存少量结构化示例，便于前台展示。

字段：

- `id`
- `entry`
- `input_example`
- `output_example`

说明：示例也可以先全部写在 Markdown 里；如果希望后续支持单独维护，再启用这张表。

---

## 8. 用户功能

### 8.1 内容浏览

用户可以：

- 浏览 Prompt / Skill / Workflow 列表
- 进入详情页查看 Markdown 渲染内容
- 查看关联项

### 8.2 搜索与筛选

支持最小筛选能力：

- 按类型筛选
- 按标签筛选
- 按状态筛选
- 按标题关键词搜索

### 8.3 后台维护

运营或维护者可以在 Directus 中：

- 编辑标题、摘要、标签、状态
- 维护条目之间的关系
- 查看 API 输出

### 8.4 内容更新流程

最简流程：

1. 在 Git 中新增或修改 Markdown
2. 运行同步脚本，读取 frontmatter
3. 将元数据写入或更新到 Directus
4. Next.js 基于文件内容和 Directus 元数据显示页面

---

## 9. 关键流程

### 9.1 新建 Prompt

1. 新建 `/content/prompts/*.md`
2. 填写 frontmatter 和正文
3. 执行同步脚本
4. Directus 中出现该条目
5. Next.js 前台可浏览

### 9.2 建立 Workflow 关联

1. 新建 workflow Markdown
2. 在 Directus 中配置该 workflow 与 prompt/skill 的关系
3. 前台详情页展示“依赖的 Prompt / Skill”

### 9.3 查找可复用内容

1. 用户进入列表页
2. 按 `type/tag/model/status` 筛选
3. 打开详情页
4. 复制正文或查看示例后使用

---

## 10. 最简技术方案

### 10.1 Directus

用途：

- 后台数据管理
- 元数据和关系存储
- 提供 REST / GraphQL API

只做 CMS，不做正文主存储。

### 10.1.1 数据库选型：Postgres vs SQLite

本项目需要考虑两个现实约束：

- 要跨平台，开发环境尽量少依赖
- 要方便部署，最好能先低成本启动

对比：

| 维度 | SQLite | Postgres |
| --- | --- | --- |
| 本地开发 | 最简单，开箱即用，无需单独起数据库服务 | 需要额外安装或容器 |
| 跨平台 | 很强，macOS / Linux / Windows 都容易跑 | 也强，但环境准备更重 |
| 部署复杂度 | 最低，单文件数据库 | 较高，需要独立数据库实例 |
| 并发能力 | 适合低并发后台管理 | 更适合多人协作和生产流量 |
| 关系查询 | 能支持当前 MVP | 更稳，更适合复杂关系和后续扩展 |
| 备份迁移 | 文件级备份简单 | 标准化更强，云部署更成熟 |
| Directus 长期适配 | 可用于小规模场景 | 更适合长期正式运行 |

结论：

- 如果目标是 `本地优先、单机部署、快速验证`，SQLite 更合适
- 如果目标是 `多人协作、云部署、长期生产`，Postgres 更合适

### 10.1.2 MVP 推荐

本项目的 MVP 推荐默认使用 `SQLite`，理由：

- 最符合“保持简单”的要求
- 对跨平台开发最友好
- 对个人项目、小团队内部系统、单机部署最省事
- 当前系统的核心数据量很小，正文又主要在 Markdown，不会给数据库带来明显压力

MVP 约束前提：

- Directus 主要承担元数据管理，不承载大量正文
- 并发写入很低，主要是少量后台编辑
- 不要求复杂审计、权限和高可用

### 10.1.3 升级策略

为了保证“长期可进化”，数据库策略设计为：

- `MVP: SQLite`
- `Production-ready 阶段: Postgres`

也就是：

- 第一阶段优先降低部署门槛
- 当出现多人频繁编辑、正式线上发布、复杂筛选与统计需求时，再迁移到 Postgres

这样可以避免在系统尚未验证前就引入过重基础设施。

### 10.2 Next.js

用途：

- 前台站点
- 列表、详情、搜索页
- Markdown 渲染

推荐：

- App Router
- SSG/ISR 优先
- 服务端读取 Directus API

### 10.3 Markdown

用途：

- 正文内容源
- Git 版本管理
- 便于代码审查和批量迁移

### 10.4 同步脚本

一个简单脚本即可：

- 扫描 `/content/**.md`
- 解析 frontmatter
- upsert 到 Directus `entries`

MVP 不需要双向同步，只做：

- `Markdown -> Directus`

这是最稳妥的单向数据流。

### 10.5 部署建议

为兼顾跨平台和简化部署，MVP 推荐以下方式：

- `Next.js`：单独部署
- `Directus`：单独部署
- `Markdown content`：和 Next.js 项目同仓库
- `SQLite`：作为 Directus 的本地数据库文件

推荐部署形态：

1. 本地开发：Node.js + Directus + SQLite
2. Docker 部署：一个 Next.js 容器 + 一个 Directus 容器 + 挂载 SQLite 数据卷

说明：

- 这种方式最容易在 macOS / Linux / Windows 上保持一致
- 对小团队和内部系统足够
- 后续若迁移到 Postgres，只替换 Directus 数据库配置，不改变内容模型和前台结构

---

## 11. 页面范围

MVP 只做 5 个页面：

1. 首页
2. Prompt 列表页
3. Skill 列表页
4. Workflow 列表页
5. 详情页

详情页展示模块：

- 标题
- 摘要
- 标签
- 适用模型
- 正文 Markdown
- 关联内容
- 最近更新时间

---

## 12. 权限与角色

MVP 只定义两类角色：

- `Viewer`：查看前台内容
- `Editor`：在 Directus 后台维护元数据

Markdown 文件修改仍然通过 Git 完成。

---

## 13. 验收标准

以下即 MVP 完成标准：

### 13.1 内容管理

- 能新增 10 篇以上 Markdown 内容
- 每篇内容都能同步到 Directus
- Directus 可编辑标签、摘要、状态、关系

### 13.2 前台展示

- 可按类型浏览 Prompt / Skill / Workflow
- 可查看详情页 Markdown 内容
- 可按关键词和标签筛选

### 13.3 关系管理

- Workflow 至少能关联多个 Prompt / Skill
- 详情页能展示关联项并跳转

### 13.4 可维护性

- 新增一种内容类型时，只需扩展枚举和模板
- 正文不依赖 CMS，可直接在 Git 中迁移

---

## 14. 里程碑

### Phase 1: MVP

交付：

- Directus schema
- Markdown 内容目录
- 同步脚本
- Next.js 列表和详情页

### Phase 2: 增强检索

可加：

- 全文搜索
- 更多筛选项
- 相关推荐

### Phase 3: 轻工作流执行

可加：

- Workflow step 结构化
- 参数模板
- 执行记录

### Phase 4: 质量与治理

可加：

- 版本 diff
- 审批流
- 自动评测
- 使用数据统计

---

## 15. 风险与取舍

### 15.1 双数据源复杂度

风险：

- Markdown 和 Directus 可能不一致

取舍：

- MVP 强制以 Markdown 为源头
- Directus 只管理元数据
- 禁止在 Directus 编辑正文

### 15.2 SQLite 的扩展上限

风险：

- 当后台编辑人数增加、部署实例增加后，SQLite 会逐渐暴露并发和运维限制

取舍：

- MVP 接受 SQLite 的上限，换取最小部署成本
- 在 schema、同步脚本、API 层避免依赖 SQLite 私有能力
- 一旦进入正式生产阶段，优先迁移到 Postgres

### 15.3 关系维护成本

风险：

- 关系数据全靠人工维护，容易滞后

取舍：

- MVP 接受人工维护
- 后续再增加 lint 或自动发现引用

### 15.4 Workflow 过早复杂化

风险：

- 很容易演变成低代码编排平台

取舍：

- MVP 只把 Workflow 当“文档化流程对象”
- 不做执行引擎

---

## 16. 最小实现建议

如果只做一周内可落地的版本，建议严格控制为：

- 1 个 `entries` 集合
- 1 个 `tags` 集合
- 1 个 `entry_relations` 集合
- 1 个 SQLite 数据库文件
- 1 个同步脚本
- 1 个 Next.js 前台
- 30 篇以内 Markdown 内容

不要一开始就拆复杂 schema，也不要先做在线编辑器。

---

## 17. 一句话定义

这是一个以 `Markdown` 为内容源、以 `Directus` 为元数据中台、以 `Next.js` 为消费界面的最简 Prompt / Skill / Workflow 管理系统。

---

## 18. 后续可直接进入的实现任务

1. 定义 Directus collections schema
2. 定义 Markdown frontmatter 规范
3. 编写 `sync-content-to-directus` 脚本
4. 初始化 Next.js 列表页和详情页
5. 先录入 5 个 Prompt、3 个 Skill、2 个 Workflow 做验证
