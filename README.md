# Prompt / Skill / Workflow System

最小 starter 骨架，遵循当前 PRD：

- `Markdown` 作为正文内容源
- `Next.js` 作为前台展示层
- 本地文件系统作为内容索引与元数据管理层

## 目录结构

```txt
apps/
  web/
content/
  prompts/
  skills/
  workflows/
scripts/
```

## 当前状态

当前仓库实现以下功能：

1. 固定内容目录结构
2. 提供示例 Markdown 内容
3. 提供一个本地可运行的内容索引脚本

## 可用命令

### 内容管理
```bash
# 生成内容索引（启动服务前必须运行）
npm run content:index

# 校验内容格式
npm run content:check
```

### 启动服务
```bash
# 启动 Web 前端（已配置根目录代理）
npm run dev
```

说明：
- `content:index` 会扫描 `content/` 并生成索引文件 `content/.generated/index.json`。
- `npm run dev` 自动在根目录触发 `npm run dev -w web`。

生成文件位置：

```txt
content/.generated/index.json
```

## 运行前提

- Node.js 18+

## 下一步建议

1. 完善 `apps/web` 的页面展示逻辑
2. 增加更多的 Markdown 内容
3. 在 `content/` 中扩展自定义字段
