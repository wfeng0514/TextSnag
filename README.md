# TextSnag

> 点击、框选、复制 — 从网页任意区域提取文字，就是这么简单。

TextSnag 是一个轻量级的 Chrome 浏览器扩展，让你能够从网页的任意位置提取文字。点击工具栏图标，拖拽一个矩形框选目标区域，即可获取智能格式化后的文字内容。

## 功能特性

- **拖拽框选** — 半透明遮罩 + 镂空选区，类似截图工具的操作体验
- **智能格式化** — 块级元素自动换行、列表自动加项目符号、代码保留缩进、表格保持结构
- **深色模式** — 自动跟随系统主题切换
- **一键复制** — 浮动弹窗展示提取结果，点击按钮即可复制
- **零外部依赖** — 无需 OCR 引擎，无需联网。你的数据不会离开浏览器。

## 安装（开发模式）

```bash
git clone <你的仓库地址> textsnag
cd textsnag
npm install
npm run build
```

然后：
1. 在 Chrome 中打开 `chrome://extensions/`
2. 开启右上角**开发者模式**
3. 点击**加载已解压的扩展程序**
4. 选择 `build/chrome-mv3-prod/` 目录

## 使用方法

1. 点击 Chrome 工具栏中的 **TextSnag 图标**
2. **拖拽**一个矩形框覆盖你要提取的文字区域
3. 在弹窗中确认文字内容，点击**复制**按钮
4. 按 **Esc** 或点击弹窗外部即可关闭

## 技术栈

- [Plasmo](https://docs.plasmo.com) — 浏览器扩展框架
- React 18 + TypeScript
- Chrome Manifest V3

## 项目结构

```
src/
├── background.ts              # Service Worker
├── contents/
│   ├── textsnag.tsx           # Content Script 入口
│   └── styles.css             # 样式（含深色模式）
├── components/
│   ├── SelectionOverlay.tsx   # 拖拽框选 UI
│   └── ResultPopover.tsx      # 浮动结果弹窗
└── lib/
    ├── extractor.ts           # DOM 文字提取引擎
    └── tsn.ts                 # className 工具函数
docs/
├── PRD.md                     # 产品需求文档
├── AGENTS.md                  # 架构与开发文档
└── README.md                  # 项目说明
```

## 许可证

MIT
