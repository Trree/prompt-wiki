---
id: classify-ticket
type: prompt
title: 工单分类助手
slug: classify-ticket
status: active
tags:
  - support
  - classification
owner: team-ops
model:
  - general-llm
summary: 将客服或内部工单分类并标记优先级。
---

## 场景

用于客服、IT 支持和内部运营工单的快速归类。

## 输入要求

- 工单标题
- 工单正文
- 可选：历史处理记录

## 输出格式

- 一级分类
- 二级分类
- 优先级
- 建议路由团队

## 注意事项

- 不要臆造缺失信息
- 如果信息不足，要明确标注待补充

