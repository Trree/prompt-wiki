# Prompt / Agent / Skill System

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
  agents/
  skills/
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

# 生产模式本地启动（监听 127.0.0.1:3000）
npm run start:local
```

说明：
- `content:index` 会扫描 `content/` 并生成索引文件 `content/.generated/index.json`。
- `npm run dev` 自动在根目录触发 `npm run dev -w web`。
- `npm run start:local` 会先生成内容索引，再以生产模式启动本地服务。

生成文件位置：

```txt
content/.generated/index.json
```

## 运行前提

- Node.js 18+

## Windows 一键启动

在 Windows 上，安装 Node.js 18+ 后，直接双击仓库根目录的 `start-local.bat` 即可。

这个脚本会自动处理：

1. 检查 `node` / `npm`
2. 首次运行时自动执行 `npm install`
3. 首次运行时自动执行 `npm run build`
4. 启动本地服务 `http://127.0.0.1:3000`
5. 服务就绪后自动打开浏览器

如果你修改了前端代码，建议手动重新执行一次：

```bash
npm run build
```

## 下一步建议

1. 完善 `apps/web` 的页面展示逻辑
2. 增加更多的 Markdown 内容
3. 在 `content/` 中扩展自定义字段
