# Directus Schema MVP

这份文档定义当前 MVP 需要在 Directus 中创建的最小数据结构。

设计约束：

- 正文不进 Directus
- Markdown 是唯一正文源
- Directus 只存元数据、标签、关系
- 数据库默认使用 `SQLite`

## Collections

MVP 只需要 4 个集合：

1. `entries`
2. `tags`
3. `entries_tags`
4. `entry_relations`

---

## 1. entries

主内容表，统一承载 `prompt | skill | workflow`。

### 字段

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | 主键，和 Markdown frontmatter `id` 一致 |
| `type` | string | yes | 枚举：`prompt` / `skill` / `workflow` |
| `title` | string | yes | 展示标题 |
| `slug` | string | yes | URL slug，建议唯一 |
| `summary` | text | yes | 列表摘要 |
| `status` | string | yes | 枚举：`draft` / `active` / `archived` |
| `owner` | string | no | 内容负责人 |
| `source_path` | string | yes | Markdown 相对路径 |
| `version` | string | no | 手动版本号，MVP 可留空 |
| `models` | json | no | 模型列表，存 string array |

### 约束

- `id` 唯一
- `slug` 唯一
- `type + slug` 可作为前台路由兜底条件
- 不创建 `body` 字段，避免正文双写

---

## 2. tags

标签表。

### 字段

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | integer | yes | 自增主键 |
| `name` | string | yes | 原始标签名 |
| `slug` | string | yes | 规范化标签名，建议唯一 |

### 约束

- `slug` 唯一

---

## 3. entries_tags

`entries` 和 `tags` 的多对多关联表。

### 字段

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | integer | yes | 自增主键 |
| `entries_id` | string | yes | 关联到 `entries.id` |
| `tags_id` | integer | yes | 关联到 `tags.id` |

### 约束

- `entries_id + tags_id` 唯一，避免重复绑定

---

## 4. entry_relations

内容关系表。

### 字段

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | integer | yes | 自增主键 |
| `from_entry_id` | string | yes | 关系起点，对应 `entries.id` |
| `to_entry_id` | string | yes | 关系终点，对应 `entries.id` |
| `relation_type` | string | yes | `uses` / `depends_on` / `part_of` / `derived_from` |

### 约束

- `from_entry_id + to_entry_id + relation_type` 唯一

---

## Frontmatter -> Directus 映射

| Frontmatter | Directus field |
| --- | --- |
| `id` | `entries.id` |
| `type` | `entries.type` |
| `title` | `entries.title` |
| `slug` | `entries.slug` |
| `summary` | `entries.summary` |
| `status` | `entries.status` |
| `owner` | `entries.owner` |
| `model` | `entries.models` |
| file path | `entries.source_path` |
| `tags[]` | `tags` + `entries_tags` |

---

## 关系同步策略

MVP 推荐最简单的关系来源：

- `workflow` 正文中显式提到某个 `entry.id`
- 同步脚本自动识别这些 `id`
- 自动写入 `entry_relations`
- 默认 `relation_type = uses`

这不是长期最优方案，但足够支撑最小闭环。

---

## API 使用方式

前台默认用只读方式读取：

- `/items/entries`
- `/items/tags`
- `/items/entry_relations`

建议查询形态：

- 列表页：`entries` + `entries_tags`
- 详情页：`entries`
- 关联内容：`entry_relations`

---

## 不做的事情

MVP 不在 Directus 中创建：

- `body`
- `body_html`
- `rendered_markdown`
- `example library`
- `execution logs`
- `approval history`

这些都属于后续阶段。

