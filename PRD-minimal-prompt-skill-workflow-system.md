# PRD: Prompt / Skill / Workflow 管理系统（最简实现）

## 1. 项目目标

基于 `Next.js + Markdown` 构建一个轻量级、版本化的管理系统，用来统一管理：

- Prompt
- Skill
- Workflow

系统核心设计理念：**内容即代码 (Content as Code)**。通过 Markdown 存储正文，通过自动生成的索引文件管理元数据。

---

## 2. 背景与问题

当前 Prompt / Skill / Workflow 往往分散在不同的地方，导致难以检索、版本混乱、关系不明。本项目通过标准化的目录结构和元数据规范，解决内容的结构化存储、版本化维护和清晰展示问题。

---

## 3. 产品目标

### 3.1 核心目标

- **结构化存储**：用 Markdown 编写正文，Frontmatter 定义元数据。
- **自动化索引**：通过脚本自动扫描内容并生成 JSON 索引，供前端快速检索。
- **静态化展示**：用 Next.js 提供极速的浏览、搜索和详情展示体验。
- **Git 工作流**：所有内容通过 Git 进行版本控制、协作和评审。

### 3.2 非目标

- 本期不做：在线编辑后台、数据库持久化（如 Postgres）、实时协作、复杂执行引擎。

---

## 4. 产品范围

系统管理 3 类核心对象：

1. **Prompt**：提示词指令及其配置。
2. **Skill**：特定的能力描述、输入输出要求及示例。
3. **Workflow**：由多个步骤或 Prompt/Skill 组合成的工作流。

---

## 5. 技术架构

### 5.1 内容驱动架构

采用“**以 Markdown 为单一真值源 (Single Source of Truth)**”的架构：

1. **存储层**：`/content` 目录下的 Markdown 文件。
2. **索引层**：`scripts/build-content-index.mjs` 扫描文件，提取 Frontmatter，生成 `content/.generated/index.json`。
3. **展示层**：Next.js App Router 渲染页面，通过读取 `index.json` 实现列表浏览和关联跳转。

### 5.2 目录结构

```txt
/content
  /prompts    # 存储 Prompt
  /skills     # 存储 Skill
  /workflows  # 存储 Workflow
  /.generated # 存储自动生成的索引文件
/apps/web     # Next.js 前端应用
/scripts      # 内容处理脚本
```

---

## 6. 数据模型 (Frontmatter)

每个 Markdown 文件必须包含标准 Frontmatter：

```yaml
id: summarize-article    # 唯一标识符
type: prompt             # 类型：prompt | skill | workflow
title: 文章摘要助手        # 标题
slug: summarize-article  # URL 路径
status: active           # 状态：active | draft | archived
tags:                    # 标签列表
  - summarization
owner: team-ai           # 负责人
model:                   # 适用模型
  - gpt-4.0
summary: 用于将长文压缩为结构化摘要 # 简短摘要
```

---

## 7. 关键流程

### 7.1 内容发布流程

1. **编写**：在对应目录下创建新的 `.md` 文件。
2. **索引**：运行 `npm run content:index` 生成最新的索引文件。
3. **预览**：在本地 Next.js 应用中查看效果。
4. **提交**：将 Markdown 文件提交至 Git 仓库。

### 7.2 关系管理 (简易模式)

通过在 Markdown 正文中引用其他条目的 `id`，系统会自动识别并建立关联（如：“本工作流使用了 [summarize-article]”）。

---

## 8. 页面规划

1. **首页**：展示系统概览及快捷入口。
2. **列表页**：按类型（Prompt/Skill/Workflow）展示内容列表，支持标签筛选和搜索。
3. **详情页**：展示完整的元数据、Markdown 渲染的正文、以及自动识别的关联内容。

---

## 9. 验收标准

1. **索引自动化**：运行脚本后能正确提取所有 Markdown 文件的元数据。
2. **内容校验**：缺失必填 Frontmatter 字段时能通过校验脚本发现。
3. **零数据库依赖**：系统运行无需安装或配置任何数据库。
4. **性能体验**：列表加载和页面跳转接近瞬时。

---

## 10. 一句话定义

这是一个**纯静态、Git 驱动、零数据库负担**的 Prompt / Skill / Workflow 知识库管理系统。
