# PP 学习工具箱 - 项目框架文档

> 本文档为 AI Agent 快速上手指南，每次新 Agent 启动时阅读此文档即可全面掌握项目情况。
> 最后更新: 2026-04-12

---

## 1. 项目概述

**PP 学习工具箱** 是一个交互式学习工具合集 Web 应用，目前包含 3 个功能模块：

| 模块 | 路由 | 面向人群 | 核心功能 |
|------|------|----------|----------|
| 地产权与未来利益通关表 | `/property-law` | 法学学习者 | Property Law MBE 交互式思维导图 |
| 中文识字 | `/chinese-literacy` | 学龄前儿童 | 字卡学习 + 听音辨字测验 + 九宫格游戏 |
| 绘本馆 | `/picture-books` | 儿童 | 有声绘本逐字高亮朗读 |

**定位**: 纯前端、无后端、无数据库、无登录，数据全部在客户端/静态文件中。

---

## 2. 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 16.2.1 |
| UI 库 | React | 19.2.4 |
| 语言 | TypeScript (strict) | 5+ |
| 样式 | Tailwind CSS | 4 |
| 动画 | Framer Motion | 12.38.0 |
| 图标 | Lucide React | 1.7.0 |
| 图表 | ECharts + echarts-for-react | 6.0.0 / 3.0.6 |
| 内容 | MDX (@next/mdx) | - |
| 构建 | Turbopack (Next.js 16 默认) | - |

**重要**: 此项目使用 **Next.js 16**，与旧版有重大变化。编写代码前务必阅读 `node_modules/next/dist/docs/` 中的文档。

---

## 3. 目录结构

```
ppweb/
├── src/
│   ├── app/                          # Next.js App Router 页面
│   │   ├── layout.tsx                # 根布局 (字体: Geist Sans/Mono, 元数据)
│   │   ├── page.tsx                  # 首页 - 工具卡片列表 ("use client")
│   │   ├── globals.css               # 全局样式 (Tailwind v4 + CSS 变量)
│   │   ├── chinese-literacy/
│   │   │   └── page.tsx              # 中文识字工具 (1772 行, 最复杂的模块)
│   │   ├── picture-books/
│   │   │   └── page.tsx              # 绘本馆 (645 行)
│   │   ├── property-law/
│   │   │   └── page.tsx              # 地产权思维导图 (382 行)
│   │   └── article/
│   │       └── page.mdx              # MDX 文章 demo
│   ├── data/                         # 静态数据模块
│   │   ├── characters.ts             # 汉字数据 (693 行, 500+字分25组)
│   │   ├── property-law.ts           # 地产权法学数据 (113 行)
│   │   └── tools.ts                  # 工具注册表 (48 行)
│   └── mdx-components.tsx            # MDX 组件映射
├── public/                           # 静态资源
│   ├── audio/                        # 汉字发音 MP3 (528 个文件)
│   │   ├── manifest.json             # 字 → MP3 路径映射表
│   │   ├── 一.mp3, 二.mp3, ...       # 单字发音
│   │   └── 大-dài.mp3, ...           # 多音字特定读音
│   └── books/                        # 绘本数据
│       └── rabbit-carrot/            # 《小白兔找萝卜》
│           ├── book.json             # 书籍元数据 (页面、文字、词边界)
│           └── p1.mp3 ~ p10.mp3      # 各页音频
├── scripts/                          # 构建/数据生成脚本
│   ├── gen_audio.py                  # Azure TTS 批量生成汉字音频
│   ├── gen_book_audio.py             # 生成绘本音频
│   ├── gen_explain_audio.py          # 生成汉字解释音频
│   ├── gen_characters.js             # 生成汉字数据
│   ├── parse_chars.js                # 解析汉字源数据
│   ├── regroup.js                    # 重新分组汉字
│   └── debug_explain.py              # 调试用
├── next.config.mjs                   # Next.js 配置 (MDX + remark 插件)
├── package.json                      # 依赖管理
├── tsconfig.json                     # TypeScript 配置
├── postcss.config.mjs                # PostCSS (Tailwind v4)
├── eslint.config.mjs                 # ESLint flat config
├── CLAUDE.md                         # Agent 指令入口 → 引用 AGENTS.md
└── AGENTS.md                         # Agent 行为约束
```

---

## 4. 核心架构模式

### 4.1 所有页面均为 Client Component

每个页面文件顶部都有 `"use client"` 指令。原因：大量使用浏览器 API（Web Speech API、AudioContext、localStorage、window resize）。

### 4.2 状态管理：纯 React Hooks + localStorage

- **无**外部状态管理库 (无 Redux/Zustand/Context)
- 组件内 `useState` + `useRef` 管理运行时状态
- `localStorage` 持久化用户学习进度：
  - `"chinese-literacy-progress"` → 已学汉字集合
  - `"chinese-literacy-records"` → 间隔重复学习记录

### 4.3 数据层：全静态，无 API

- **TypeScript 数据模块** (`src/data/`) → 编译时嵌入
- **静态 JSON** (`public/books/`) → 运行时 fetch
- **音频清单** (`public/audio/manifest.json`) → 运行时 fetch
- 无后端、无数据库、无 API 路由

### 4.4 样式：Tailwind v4 Utility-First

- `globals.css` 通过 `@import "tailwindcss"` 引入
- `@theme inline` 注册 CSS 变量到 Tailwind
- 全部使用原子类，无组件库
- 响应式断点: `sm:` (640px)

### 4.5 动画：Framer Motion

- `<AnimatePresence>` + `<motion.div>` 用于页面/模式切换过渡
- `initial` / `animate` / `exit` 属性控制进场/退场

---

## 5. 各模块详细说明

### 5.1 首页 Portal (`/` → `src/app/page.tsx`)

**97 行** | 工具列表展示页

- 从 `src/data/tools.ts` 读取工具注册信息
- 按 `category` 分组显示（law → kids → other）
- 每个工具渲染为带 emoji 图标、描述、标签的卡片
- 点击卡片跳转对应路由

**添加新工具时需要做的事**:
1. 在 `src/data/tools.ts` 的 `tools` 数组添加新条目
2. 在 `src/app/<route>/page.tsx` 创建新页面
3. 首页会自动展示新工具卡片

### 5.2 中文识字 (`/chinese-literacy` → 1772 行)

**最复杂的模块**，包含多个子模式：

#### 模式流转
```
Menu（主菜单）
├── Learn（字卡学习）→ LearnDone（学习完成）
├── QuizSettings（测验设置）→ QuizPlay（答题）→ QuizResult（结果）
└── ListenQuizSettings → ListenQuiz（九宫格游戏）→ ListenResult（结果）
```

#### 核心数据结构
```typescript
interface CharItem {
  char: string;           // 汉字
  readings: CharReading[];// 读音(支持多音字)
  groupId: string;        // 所属分组 (p1~p25)
  explain?: string;       // 解释
}

interface CharReading {
  pinyin: string;         // 拼音
  words: string[];        // 组词
  emoji: string;          // 配图 emoji
}
```

#### 语音系统 (TTS + 预录音频)
- **优先使用预录 MP3** (`public/audio/`)：通过 `manifest.json` 查找
- **回退到 Web Speech API**：按优先级选择中文语音引擎 (Tingting > Lili > Meijia > ...)
- **全局中断机制**：`_abortId` 递增实现任意时刻打断播放
- **音效**：AudioContext 合成 (正确/错误/胜利音效)

#### 间隔重复算法
- 答对 → interval 翻倍 (最大 64 天)
- 答错 → interval 重置为 1
- 出题优先级: 到期复习 > 高错误率 > 新字 > 其余

### 5.3 绘本馆 (`/picture-books` → 645 行)

#### 核心数据结构
```typescript
interface BookPage {
  text: string;           // 页面文字
  subtitle?: string;      // 副标题
  audio: string;          // 音频文件路径
  words: WordBoundary[];  // 逐字时间轴
  emoji?: string;         // 背景 emoji
  bg?: string;            // 背景颜色
  vocab?: VocabItem[];    // 生词表
}

interface WordBoundary {
  w: string;  // 词
  s: number;  // 起始时间 (秒)
  e: number;  // 结束时间 (秒)
}
```

#### 功能特性
- **书架** → **阅读器** 两层界面
- 音频播放时逐字高亮跟读 (`requestAnimationFrame` 驱动)
- 自动翻页播放模式
- 生词弹窗 (悬停/点击触发，带 TTS 朗读)
- 目前仅 1 本书: 《小白兔找萝卜》(10 页)

### 5.4 地产权思维导图 (`/property-law` → 382 行)

#### 核心数据结构
```typescript
interface PropertyLawItem {
  id: string;
  name: string;           // 地产权类型名称
  magicWords: string[];   // 法律关键词
  futureInterest: {       // 配对的未来利益
    name: string;
    holder: string;
    mechanism: string;     // 自动收回/主动行权
  };
  caseStudy: string;      // 案例
  tricks: string;         // 考场陷阱提示
}
```

#### 功能特性
- **ECharts tree 图表**: 展示土地地产权体系层级
- **桌面端**: 左右布局，图表 + 侧边详情面板
- **移动端**: 上下布局，图表 + 底部抽屉面板
- 响应式: `useIsMobile(768)` hook 检测
- 移动端树图标签仅显示中文 (去掉英文)

---

## 6. 关键类型定义速查

```typescript
// src/data/tools.ts
interface Tool {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;           // emoji
  category: "law" | "kids" | "other";
  tags: string[];
}

// src/data/characters.ts
interface CharItem { char, readings: CharReading[], groupId, explain? }
interface CharReading { pinyin, words: string[], emoji }
interface CharGroup { id, name, chars: CharItem[] }

// src/data/property-law.ts
interface PropertyLawItem { id, name, magicWords[], futureInterest, caseStudy, tricks }

// picture-books (内联在 page.tsx)
interface Book { id, title, author, ageRange, pages: BookPage[] }
interface BookPage { text, subtitle?, audio, words: WordBoundary[], emoji?, bg?, vocab? }
interface WordBoundary { w, s, e }
interface VocabItem { word, pinyin, meaning }
```

---

## 7. 构建与运行

```bash
# 安装依赖
npm install

# 开发模式 (Turbopack)
npm run dev        # → http://localhost:3000

# 生产构建
npm run build

# 启动生产服务
npm start

# 代码检查
npm run lint
```

### 音频/数据生成脚本 (按需)

```bash
# 需要 Python (.venv) + Azure Speech SDK
python scripts/gen_audio.py           # 批量生成汉字 MP3
python scripts/gen_book_audio.py      # 生成绘本页面音频
python scripts/gen_explain_audio.py   # 生成汉字解释音频

# Node.js 数据脚本
node scripts/gen_characters.js        # 生成 characters.ts 数据
node scripts/parse_chars.js           # 解析原始汉字数据
node scripts/regroup.js               # 重新分组
```

---

## 8. 开发约定与注意事项

### 8.1 新增工具的标准流程

1. **注册工具**: 在 `src/data/tools.ts` 添加条目 (id, title, description, href, icon, category, tags)
2. **创建页面**: `src/app/<tool-id>/page.tsx`，文件顶部加 `"use client"`
3. **数据文件** (如有): 放 `src/data/<tool-id>.ts`
4. **静态资源** (如有): 放 `public/<相关目录>/`
5. 首页自动展示，无需额外修改

### 8.2 编码风格

- 每个工具页面为 **单文件组件** (所有子组件、hooks、工具函数都在同一文件)
- 命名: 组件 PascalCase, 函数/变量 camelCase, 常量 UPPER_SNAKE_CASE
- CSS: 纯 Tailwind 原子类，不写自定义 CSS 类 (除 globals.css 中的变量)
- 所有页面均有返回首页的 `<ArrowLeft>` 导航按钮

### 8.3 Next.js 16 注意事项

- **默认使用 Turbopack** (无自定义 webpack 配置)
- **App Router only** (无 Pages Router)
- 异步 Request API: `cookies()`, `headers()`, `params`, `searchParams` 需要 await
- `middleware` 已更名为 `proxy`
- ESLint 使用 Flat Config 格式
- 编码前建议阅读: `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`

### 8.4 已知的技术债/改进空间

- `chinese-literacy/page.tsx` 有 1772 行，可考虑拆分为多个组件文件
- 绘本馆目前只有 1 本书，书架功能预留了扩展接口
- 无单元测试 / E2E 测试
- 无 CI/CD 配置
- 无暗色模式 (CSS 变量已预留但页面未适配)

---

## 9. Git 提交历史摘要 (近期)

```
0f79897 feat: 优化出题范围选择，快捷按钮+单击微调
66ac75d feat: 测验结果页显示出题范围和测验内容总结
4410ea0 feat: 新增听音选字九宫格游戏模式
f708637 feat: 统一抽象字语音为预录音频，翻页停止播放
8376c5d feat: spaced repetition quiz + abstract char explanations
05e0db3 feat: picture book reader with audio narration, word highlighting, vocab popups
c7ad083 feat: 全量预录音频 + Azure Speech多音字精准发音
753f0bb feat: 500字25期 + 多音字预录音频 + UI优化
a022884 feat: Chinese literacy learning tool (Phase 1)
d2cf9bc feat: Portal homepage + move mind map to /property-law route
9a055ac feat: complete interactive property law mind map
```

提交风格: `feat:` / `fix:` / `chore:` 前缀，中英文混合描述。

---

## 10. 快速索引

| 需求 | 找哪个文件 |
|------|-----------|
| 添加新工具到首页 | `src/data/tools.ts` |
| 修改首页布局 | `src/app/page.tsx` |
| 修改全局样式/字体 | `src/app/globals.css` + `src/app/layout.tsx` |
| 添加/修改汉字数据 | `src/data/characters.ts` |
| 修改识字学习逻辑 | `src/app/chinese-literacy/page.tsx` |
| 修改绘本功能 | `src/app/picture-books/page.tsx` |
| 添加新绘本 | `public/books/<book-id>/` + 修改 BOOKS 数组 |
| 修改地产权数据 | `src/data/property-law.ts` |
| 修改思维导图 | `src/app/property-law/page.tsx` |
| 生成汉字音频 | `scripts/gen_audio.py` |
| 生成绘本音频 | `scripts/gen_book_audio.py` |
| Next.js 配置 | `next.config.mjs` |
| 查 Next.js 16 新特性 | `node_modules/next/dist/docs/` |
