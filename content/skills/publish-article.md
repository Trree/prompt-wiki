---
id: publish-article
type: skill
title: 文章发布技能
slug: publish-article
status: active
tags:
  - publishing
  - process
owner: team-ai
model:
  - none
summary: 从文章整理到发布的最小内容复合技能。
---

## 目标

把一篇原始文章整理、润色、配图并发布。

## 内部步骤

1. 用摘要 Prompt 提取文章重点
2. 用格式化 Skill 调整 Markdown 结构
3. 用配图 Skill 生成插图提示
4. 人工审核后发布

## 依赖能力

- summarize-article
- article-illustrator
