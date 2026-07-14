# Echo PRD-V1 — 已实现产品规范

> 版本：v1.0 · 2026-06-14
> 状态：✅ 已实现 — 当前代码基线
> 基础代码库：Handy (cjpais/Handy) — MIT License

---

## 1. 产品概述

### 1.1 定位

面向中文用户的离线优先全局语音输入工具，提供本地识别为主、云端后处理为辅的流畅体验。

### 1.2 核心原则

- 中文优先：默认模型 SenseVoice，默认 UI 简体中文
- 离线优先：本地识别主导，云端后处理可选
- 输入效率工具：不做功能堆砌，做好两条主链路
- 两条主链路：Alt+Q 普通听写 → 识别 → 粘贴 | Alt+Z AI 模式 → 录音 → LLM → 结果

### 1.3 平台

- Windows（当前主力，已构建可运行）
- macOS/Linux（代码框架已就位，跨平台焦点检测未完全验证）

### 1.4 技术基础

- Fork Handy (cjpais/Handy) Tauri 2.0 架构
- Rust + TypeScript/React (Vite)
- 可插拔模型引擎系统（SenseVoice / Whisper / Parakeet）
- VAD 语音活动检测 | CPAL 音频捕获 | 全局热键

---

## 2. 功能清单

### ✅ P0 — 核心功能（均已实现）

| # | 功能 | 说明 | 触发方式 |
|---|------|------|---------|
| 1 | 普通听写 | 录音 → SenseVoice 识别 → 自动粘贴 | Alt+Q（按住说话 / 切换模式） |
| 2 | AI 模式 | 录音 → 识别 → LLM 后处理 → 结果路由（粘贴或浮窗） | Alt+Z，需配置 API Key |
| 3 | 选中文本+语音指令 | AI 模式自动携带选中文本作为 LLM 上下文 | Alt+Z 前选中文本 |
| 4 | 浮动结果窗 | AI 模式结果兜底展示（无焦点时弹出） | Alt+Z 结果不可粘贴时自动弹出 |
| 5 | 后处理设置 | 供应商选择、API Key 配置、Prompt 编辑 | 设置 → 后处理 |
| 6 | 快捷键自定义 | 听写 / AI 模式快捷键可自定义 | 设置 → 快捷键 |
| 7 | 首次模型自动下载 | 首次启动自动下载 SenseVoice，显示进度 | 开箱即用 |

### ✅ P1 — 扩展功能（均已实现）

| # | 功能 | 说明 |
|---|------|------|
| 8 | 录音模式切换 | 按住说话 / 切换模式可选 |
| 9 | 听写历史 | 最近转录记录查看、重试、保存、删除 |
| 10 | 简体/繁体中文转换 | OpenCC 集成 |
| 11 | 音频反馈 | 录音开始/结束提示音 |
| 12 | LLM 结构化输出 | JSON Schema 支持 |
| 13 | 多供应商支持 | DeepSeek / 阿里百炼 / OpenAI / 自定义(OpenAI 兼容) |

### ✅ P2 — 辅助功能（均已实现）

| # | 功能 | 说明 |
|---|------|------|
| 14 | 品牌替换 | 应用名 Echo, Bundle ID com.echo.desktop |
| 15 | 界面中文化 | 全部设置页、侧边栏、引导界面中文 |
| 16 | 剪贴板备份与恢复 | 粘贴后恢复用户原有剪贴板内容 |

---

## 3. 交互流程

### 3.1 首次启动

```
安装 → 启动 Echo
     → Step 1: 品牌闪屏（Echo logo）
     → Step 2: 权限引导（麦克风授权）
     → Step 3: 后台自动下载 SenseVoice（进度条 %）
     → Step 4: 显示"Echo 已就绪"
     → Step 5: 进入托盘模式
```

### 3.2 听写模式（Alt+Q）

```
按下 Alt+Q（或切换模式后按一下）
    → 托盘图标变色（录音中）
    → 可选显示录音覆盖层（音量条动画）
用户说话
松开 Alt+Q（或再按一下）
    → 音频送入 SenseVoice
    → 识别结果自动粘贴到当前光标位置
    → 如有后处理配置，先清洗再粘贴
    → 托盘图标恢复
```

### 3.3 AI 模式（Alt+Z）

```
用户选中文本（可选）
按下 Alt+Z
    → 开始录音
用户说指令（"改成更正式的语气"）
松开 Alt+Z
    → 音频识别为文字
    → 构造 LLM 请求（选中文本 + 语音指令）
    → LLM 返回结果
    → 路由决策:
        ├─ 有可编辑文本框焦点 → 直接粘贴（替换选中文本）
        └─ 无可编辑焦点 → 弹出浮动结果窗
```

### 3.4 浮动结果窗

```
场景：AI 模式结果无法直接粘贴时弹出

窗口规格：
┌──────────────────────────────────────┐  ← 圆角 14px
│ ECHO AI                    [复制] [✕]│  ← 标题栏可拖拽
├──────────────────────────────────────┤
│                                      │
│  纯文本结果展示（当前）               │
│  （后续支持 Markdown 渲染）          │  ← 可滚动（上限 320px）
│                                      │  ← 文本可选择
├──────────────────────────────────────┤
│         ESC 关闭 · 拖拽移动           │
└──────────────────────────────────────┘
        窗口宽 380px · 高度自适应 · 底部居中 · 始终置顶

交互规则：
- 点击 ✕ 或 ESC → 关闭
- 标题栏可拖拽移动
- 开始新录音 → 自动关闭（后端能力已就位，前端收口待确认）
- 新的 AI 结果到来 → 替换内容，保持显示
- 不可粘贴时自动弹出，不是独立快捷键功能
```

---

## 4. 快捷键体系

### 4.1 默认绑定

| 功能 | Windows | macOS | 状态 |
|------|---------|-------|------|
| 听写模式 | Alt+Q | Option+Q | ✅ |
| AI 模式 | Alt+Z | Option+Z | ✅ |
| ~~浮动窗口~~ | ~~Alt+X~~ | ~~Option+X~~ | ❌ 已移除（设计修正） |

### 4.2 设计规则

- 均为两个键组合，便于按住说话
- 不与系统快捷键冲突
- 全部可自定义（Handy 快捷键系统）
- Alt+X 已移除：浮动窗是 AI 模式的结果路由兜底，不是独立功能

---

## 5. 设置项完整清单

### 5.1 通用 (General)

| 设置项 | 类型 | 默认值 | 选项 |
|-------|------|--------|------|
| 语言 | 下拉 | 简体中文 | 简体中文 / English / 繁体中文 |
| 主题 | 选择 | 跟随系统 | 浅色 / 深色 / 跟随系统 |
| 开机自启 | 开关 | 关 | 开/关 |
| 托盘图标 | 开关 | 开 | 开/关 |

### 5.2 快捷键 (Shortcuts)

| 设置项 | 类型 | 默认值 |
|-------|------|--------|
| 听写快捷键 | 录制组合键 | Alt+Q / Option+Q |
| AI 模式快捷键 | 录制组合键 | Alt+Z / Option+Z |

### 5.3 听写 (Dictation / 模型)

| 设置项 | 类型 | 默认值 | 选项 |
|-------|------|--------|------|
| 录音模式 | 选择 | 按住说话 | 按住说话 / 切换模式 |
| 麦克风 | 下拉 | 系统默认 | 系统输入设备列表 |
| VAD 灵敏度 | 滑块 | 中 | 低/中/高 |
| 语言 | 下拉 | 自动检测 | 自动 / 简体中文 / 繁体中文 / English |
| 识别引擎 | 下拉 | SenseVoice | SenseVoice / Whisper / Parakeet |
| 自动粘贴 | 开关 | 开 | 开/关 |

### 5.4 后处理 (AI / Post-Processing)

| 设置项 | 类型 | 默认值 | 说明 |
|-------|------|--------|------|
| 供应商 | 下拉 | — | DeepSeek / 阿里百炼 / OpenAI / 自定义 |
| 自定义端点 | 输入框 | — | 仅自定义时可用 |
| API Key | 密码输入 | — | 存储在本地 |
| 模型名称 | 输入框/下拉 | — | 根据供应商动态 |
| 选中文本处理 | 开关 | 开 | AI 模式是否自动携带选中文本 |
| Prompt 模板列表 | 列表 | 默认 Prompt | 用户可添加/编辑/删除 |

#### 默认 Prompt 模板

```yaml
id: "clean_and_polish"
name: "清洗与润色"
prompt: |
  你是一个文本整理助手。用户刚通过语音输入了一段文字，
  你的任务是清洗口语化表达，添加标点符号，修正语法错误，
  但保持原意不变。直接输出整理后的文本，不要添加解释。
```

### 5.5 历史 (History)

| 功能 | 说明 |
|------|------|
| 最近记录列表 | 按时间倒序排列 |
| 重试转录 | 用同一音频重新识别 |
| 保存/删除 | 手动管理 |

### 5.6 关于 (About)

| 项目 | 值 |
|------|-----|
| 版本号 | Echo 0.1.0 |
| 协议 | MIT（继承 Handy）|
| 模型路径 | 当前模型文件路径显示 |
| 数据目录 | 路径显示，可点击打开 |
| 日志目录 | 路径显示，可点击打开 |

---

## 6. 技术架构

### 6.1 Rust 后端

| 模块 | 路径 | 用途 |
|------|------|------|
| actions | `src-tauri/src/actions.rs` | 快捷键动作定义与路由 |
| overlay | `src-tauri/src/overlay.rs` | 窗口创建（录音覆盖层、浮动窗） |
| settings | `src-tauri/src/settings.rs` | 设置结构体与快捷键绑定 |
| llm_client | `src-tauri/src/llm_client.rs` | LLM API 客户端（OpenAI 兼容） |
| clipboard | `src-tauri/src/clipboard.rs` | 剪贴板操作与焦点检测 |
| transcription_coordinator | `src-tauri/src/transcription_coordinator.rs` | 录音流水线协调 |
| shortcut/handler | `src-tauri/src/shortcut/handler.rs` | 快捷键事件路由 |
| managers/model | `src-tauri/src/managers/model.rs` | 模型管理（推荐/下载/引擎） |
| managers/history | `src-tauri/src/managers/history.rs` | 历史记录管理 |
| commands | `src-tauri/src/commands/` | Tauri 命令注册 |

### 6.2 TypeScript 前端

| 模块 | 路径 | 用途 |
|------|------|------|
| App | `src/App.tsx` | 主应用入口 |
| floating/FloatingWindow | `src/floating/FloatingWindow.tsx` | 浮动结果窗组件 |
| overlay/RecordingOverlay | `src/overlay/RecordingOverlay.tsx` | 录音覆盖层 |
| settings/* | `src/components/settings/` | 各设置页面 |
| stores/settingsStore | `src/stores/settingsStore.ts` | 设置状态管理 |
| i18n/zh | `src/i18n/locales/zh/translation.json` | 中文翻译 |

### 6.3 浮动窗口实现

```rust
// Tauri WebviewWindow
WebviewWindowBuilder::new(app, "floating-window", ...)
    .decorations(false)        // 无边框
    .transparent(true)         // 透明背景
    .always_on_top(true)       // 始终置顶
    .skip_taskbar(true)        // 不在任务栏显示
    .focused(false)            // 不抢焦点
    .inner_size(380, adaptive) // 宽度固定，高度自适应
    .position(bottom_center)   // 底部居中
```

---

## 7. 平台差异

| 特性 | Windows | macOS |
|------|---------|-------|
| 麦克风权限 | 原生权限弹窗 | 原生权限弹窗 |
| 辅助功能 | ⌨️ 无需额外权限 | 需要系统偏好设置授权 |
| 可编辑焦点检测 | ✅ hasEditableFocus() 已实现 | ⏳ 未实现，当前返回 false |
| 浮动窗置顶 | ✅ WS_EX_TOPMOST | ⏳ 待验证 |
| 快捷键注册 | ✅ global-shortcut 插件 | ✅ global-shortcut 插件 |
| 构建 | ✅ NSIS 安装包 | ⏳ 需要 macOS 构建环境 |

---

## 8. 当前已知局限

以下为当前已识别但未在 V1 范围内解决的问题，详见 PRD-V2：

| # | 问题 | 影响 | 严重程度 |
|---|------|------|---------|
| 1 | Alt+Z 未配 API Key 时缺少明确提示 | 用户困惑 | P0 |
| 2 | Openclaw / Web 输入框粘贴兼容不稳定 | 功能可用性 | P0 |
| 3 | 非 Windows 可编辑焦点不完整 | 跨平台一致性 | P0 |
| 4 | 浮动窗纯文本，无 Markdown 渲染 | 可读性 | P1 |
| 5 | 新录音自动关闭浮窗未完全收口 | 交互完整性 | P1 |
| 6 | 浮动窗"替换选中"按钮未实现 | 可用性 | P1 |
| 7 | 发布流程未建立（本地可 build，无正式 Release）| 产品上线 | P1 |
| 8 | 后处理 Provider 以海外为主，未按国内场景排序 | 产品心智 | P1 |
| 9 | 模型说明偏技术视角，缺少中文场景标签 | 用户认知 | P1 |
| 10 | 品牌心智未完全统一（边缘 Handy 残留）| 品牌一致性 | P1 |

---

## 9. 附录：代码基线

| 属性 | 值 |
|------|-----|
| 仓库 | `D:\AI\Projects\echo` |
| 最后提交 | `8d4731e refactor: align Echo UI and branding` |
| 构建方式 | `bun tauri build` |
| 输出 | `Echo_0.1.0_x64-setup.exe` |
| 安装路径 | `D:\AppGallery\Software\Echo` |
