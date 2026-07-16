# AGENTS.md

## 项目概述

TextSnag 是一个 Chrome 浏览器扩展，用户点击工具栏图标、拖拽框选页面区域后，即可提取该区域内的文字并一键复制。基于 Plasmo（React + TypeScript）构建，目标平台为 Manifest V3。

## 架构

```
用户点击工具栏图标
        │
        ▼
┌───────────────────┐
│  background.ts    │  Service Worker — 监听 chrome.action.onClicked,
│                   │  向当前标签页发送 TOGGLE_SELECTION 消息
└───────┬───────────┘
        │ chrome.tabs.sendMessage()
        ▼
┌───────────────────┐
│  textsnag.tsx     │  Content Script — 始终注入 (<all_urls>),
│  (contents/)      │  状态机: idle → selecting → result
└───────┬───────────┘
        │
   ┌────┴────┐
   ▼         ▼
┌────────┐ ┌──────────┐
│Overlay │ │Popover   │  React 组件，直接渲染到页面 DOM
│遮罩+   │ │文字+复制  │
│框选    │ │          │
└───┬────┘ └────┬─────┘
    │            │
    ▼            │
┌────────────┐   │
│extractor.ts│   │  纯函数：DOM 文字提取 + 智能格式化
└────────────┘   │
                 │
          navigate.clipboard.writeText()
```

## 关键设计决策

- **DOM 提取而非 OCR**：从选区覆盖的 DOM 节点直接提取文字，更快、更准、零外部依赖。
- **4-div 遮罩方案**：四个绝对定位的 div 拼出半透明遮罩 + 镂空选区，比 CSS clip-path 更简单可靠。
- **常驻 Content Script**：使用 `<all_urls>` 匹配以确保可靠性。脚本在闲置状态下渲染 `null`，仅在用户点击图标时才激活。
- **阶段状态机**：`idle` → `selecting` → `result`，控制组件渲染并防止并发选择。
- **无 Shadow DOM**：组件直接渲染到页面中以保证全视口覆盖。所有 CSS 类名以 `ts-` 为前缀避免冲突。

## 文档体系

| 文档 | 面向读者 | 用途 |
|------|----------|------|
| `docs/PRD.md` | 所有人 | **唯一真相源** — 所有功能需求的完整记录，每次改动的决策依据 |
| `AGENTS.md` | AI / 开发者 | 架构设计、技术决策、编码规范、文件职责 |
| `README.md` | 用户 / 开发者 | 项目简介、安装步骤、使用方法 |

`docs/` 目录仅存放需求相关文档。新功能的设计文档、技术方案等按命名格式 `docs/YYYY-MM-DD-<主题>.md` 放入其中。

### PRD 更新规则

**任何新功能、行为变更、交互调整，都必须在 `docs/PRD.md` 中记录：**

1. 在对应章节追加或修改需求条目
2. 在「变更记录」表格中新增一行（日期 + 版本号 + 变更摘要）
3. 如果变更涉及架构或文件变化，同步更新 `AGENTS.md` 中的对应内容

PRD 是唯一的产品真相源。代码审查时，先对照 PRD 确认行为是否符合预期。

---

## 技术栈

- **Plasmo** 0.90+ — 浏览器扩展框架
- **React 18** — UI 组件
- **TypeScript 5** — 类型安全
- **CSS 自定义属性** — 主题切换（通过 `prefers-color-scheme` 支持亮/暗色）

## 文件职责

| 文件 | 职责 |
|------|------|
| `src/background.ts` | Service Worker — 图标点击 → 消息分发 |
| `src/contents/textsnag.tsx` | Content Script 入口 — 阶段状态、消息监听、组件挂载 |
| `src/contents/styles.css` | 全部样式，CSS 自定义属性实现亮色/暗色主题 |
| `src/components/SelectionOverlay.tsx` | 全屏遮罩 + 镂空选区 + 拖拽交互 |
| `src/components/ResultPopover.tsx` | 浮动弹窗 — 文字展示、复制按钮、关闭行为 |
| `src/lib/extractor.ts` | 核心提取引擎 — DOM 遍历、智能格式化 |
| `src/lib/tsn.ts` | className 工具 — `tsn("ts-foo", cond && "ts-foo--active")` → `"ts-foo ts-foo--active"` |
| `assets/icon*.png` | 扩展图标，16/32/48/64/128px |
| `docs/PRD.md` | 产品需求文档 — 所有功能需求的完整记录与变更历史 |
| `AGENTS.md` | 架构与开发文档（本文件） |
| `README.md` | 项目说明 — 简介、安装、使用 |

## 权限说明

| 权限 | 原因 |
|------|------|
| `activeTab` | 仅在用户点击图标时获取当前标签页访问权 |
| `scripting` | Plasmo 框架注入 Content Script 所需 |
| `clipboardWrite` | 将提取的文字写入剪贴板 |
| `storage` | 预留用于未来的设置持久化 |
| `host_permissions: <all_urls>` | Content Script 需在所有页面注入 |

## 开发指南

### 首次搭建
```bash
npm install
npm run dev     # 启动开发服务器，支持热更新
```

### 在 Chrome 中加载
1. 打开 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」→ 选择 `build/chrome-mv3-dev/`

### 生产构建
```bash
npm run build       # 输出到 build/chrome-mv3-prod/
npm run package     # 打包为 .zip，用于 Chrome Web Store 上架
```

### 本地测试
在 Chrome 中打开 `test-page.html`，该页面包含段落、列表、代码块、表格、图片、链接等 TextSnag 支持的所有元素类型。

## 编码规范

- 所有 CSS 类名以 `ts-` 为前缀，避免与页面样式冲突
- `tsn()` 工具函数是 className 拼接的唯一入口
- 组件为纯 React 组件，无需 Plasmo 专用 hooks
- 使用 `chrome.runtime.onMessage` 实现 background → content script 通信
- 文字提取逻辑为纯函数，可脱离 DOM 独立测试

## 已知限制

- 无法提取 `<canvas>`、SVG 文本节点或图片中的文字（无 OCR）
- 无法提取 iframe 中的内容（跨域限制）
- Content Script 不会注入 `chrome://` 或 `chrome-extension://` 页面
- 选区过程中如有 CSS 动画正在播放，遮罩定位可能出现视觉抖动
