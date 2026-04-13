# PP 学习工具箱 - 项目框架文档

> 本文档为 AI Agent 快速上手指南，每次新 Agent 启动时阅读此文档即可全面掌握项目情况。
> 最后更新: 2026-04-12

---

## 1. 项目概述

**PP 学习工具箱** 是一个交互式学习工具合集 Web 应用，目前包含 3 个功能模块：

| 模块 | 路由 | 面向人群 | 核心功能 |
|------|------|----------|----------|
| 地产权与未来利益通关表 | `/property-law` | 法学学习者 | Property Law MBE 交互式思维导图 |
| 中文识字 | `/chinese-literacy` | 学龄前儿童 | 字卡学习 + 智能测验 + 九宫格游戏 + 易错字表 |
| 绘本馆 | `/picture-books` | 儿童 | 有声绘本逐字高亮朗读 |

**定位**: 前端 + Supabase BaaS，支持用户登录和多设备数据同步。

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
| 后端/Auth/DB | Supabase (Auth + PostgreSQL) | @supabase/supabase-js |
| 构建 | Turbopack (Next.js 16 默认) | - |

**重要**: 此项目使用 **Next.js 16**，与旧版有重大变化。编写代码前务必阅读 `node_modules/next/dist/docs/` 中的文档。

---

## 3. 目录结构

```
ppweb/
├── src/
│   ├── app/                          # Next.js App Router 页面
│   │   ├── layout.tsx                # 根布局 (字体 + AuthProvider 包裹)
│   │   ├── page.tsx                  # 首页 - 工具列表 + 右上角登录/头像 (133 行)
│   │   ├── globals.css               # 全局样式 (Tailwind v4 + CSS 变量)
│   │   ├── login/
│   │   │   └── page.tsx              # 登录页 - Google OAuth + Magic Link (190 行)
│   │   ├── chinese-literacy/
│   │   │   └── page.tsx              # 中文识字工具 (2133 行, 最复杂的模块)
│   │   ├── picture-books/
│   │   │   └── page.tsx              # 绘本馆 (650 行)
│   │   ├── property-law/
│   │   │   └── page.tsx              # 地产权思维导图 (387 行)
│   │   └── article/
│   │       └── page.mdx              # MDX 文章 demo
│   ├── lib/                          # 共享基础设施
│   │   ├── supabase.ts               # Supabase 客户端初始化 (6 行)
│   │   ├── auth-context.tsx          # AuthProvider + useAuth hook (118 行)
│   │   ├── require-auth.tsx          # RequireAuth 登录守卫组件 (39 行)
│   │   └── migrate-local-data.ts     # localStorage → Supabase 数据迁移 (274 行)
│   ├── data/                         # 静态数据模块
│   │   ├── characters.ts             # 汉字数据 (693 行, 500+字分25组)
│   │   ├── property-law.ts           # 地产权法学数据 (113 行)
│   │   └── tools.ts                  # 工具注册表 (48 行)
│   └── mdx-components.tsx            # MDX 组件映射
├── public/                           # 静态资源
│   ├── audio/                        # 汉字发音 MP3 (528 个文件)
│   │   ├── manifest.json             # 字 → MP3 路径映射表
│   │   └── *.mp3                     # 单字发音 + 多音字特定读音
│   └── books/                        # 绘本数据
│       └── rabbit-carrot/            # 《小白兔找萝卜》(book.json + p1~p10.mp3)
├── scripts/                          # 构建/数据生成脚本 (Python + Node.js)
├── .env.local                        # Supabase URL + anon key (不入库)
├── next.config.mjs                   # Next.js 配置 (MDX + remark 插件)
├── package.json                      # 依赖管理
├── tsconfig.json                     # TypeScript 配置
└── CLAUDE.md → AGENTS.md             # Agent 行为约束
```

---

## 4. 核心架构模式

### 4.1 用户认证与登录流程

```
用户打开网站 → 首页自由浏览（无需登录）
    │
    └── 点击任意游戏工具 → RequireAuth 检查登录状态
            ├── 已登录 → 进入游戏
            └── 未登录 → 跳转 /login?redirect=xxx
                          ├── Google OAuth 一键登录
                          └── 邮箱 Magic Link 登录
                          → 登录成功 → 自动迁移 localStorage 老数据 → 跳回游戏页
```

**关键组件：**
- `AuthProvider`（`src/lib/auth-context.tsx`）：全局 React Context，提供 `useAuth()` hook
- `RequireAuth`（`src/lib/require-auth.tsx`）：游戏页面守卫，未登录自动跳转
- `migrateLocalData`（`src/lib/migrate-local-data.ts`）：首次登录时自动迁移 localStorage 数据

### 4.2 数据持久化：Supabase PostgreSQL

**数据流**：前端 → Supabase JS SDK → Supabase PostgreSQL（直连，无 API Routes）

**Supabase 表结构：**
| 表名 | 用途 | RLS |
|------|------|-----|
| `profiles` | 用户信息（昵称、头像） | 所有人可读，本人可写 |
| `game_stats` | 排行榜数据（预留） | 所有人可读，本人可写 |
| `literacy_records` | 识字游戏 - 每字学习记录 | 本人可读写 |
| `literacy_progress` | 识字游戏 - 已浏览的字 | 本人可读写 |

**识字游戏学习记录（`literacy_records`）：**
```sql
(user_id, char, right_count, wrong_count, level, last_seen, next_review, mastered)
-- level: 0~5 对应遗忘曲线等级
-- UNIQUE(user_id, char)
```

**排行榜数据（`game_stats`，预留）：**
```sql
(user_id, game_id, total_days, streak_days, last_played_at, mastered_count, total_attempts, correct_attempts)
-- UNIQUE(user_id, game_id)
```

### 4.3 所有页面均为 Client Component

每个页面文件顶部都有 `"use client"` 指令。原因：大量使用浏览器 API + Supabase 实时交互。

### 4.4 样式：Tailwind v4 Utility-First

- `globals.css` 通过 `@import "tailwindcss"` 引入
- 全部使用原子类，无组件库
- 配色：slate 基底，indigo 强调色，rose 用于错误/易错相关 UI

### 4.5 动画：Framer Motion

- `<AnimatePresence>` + `<motion.div>` 用于页面/模式切换过渡

---

## 5. 各模块详细说明

### 5.1 首页 Portal (`/` → `src/app/page.tsx`)

**133 行** | 工具列表展示页

- 从 `src/data/tools.ts` 读取工具注册信息，按 category 分组
- **右上角**：未登录显示"登录"链接，已登录显示用户头像 + 退出按钮
- 首页不需要登录即可浏览

### 5.2 登录页 (`/login` → `src/app/login/page.tsx`)

**190 行** | 独立登录页

- Google OAuth 一键登录 + 邮箱 Magic Link
- 接收 `?redirect=xxx` 参数，登录后跳回原页面
- 用 `<Suspense>` 包裹（Next.js 16 要求 useSearchParams 必须在 Suspense 内）

### 5.3 中文识字 (`/chinese-literacy` → 2133 行)

**最复杂的模块**，包含多个子模式：

#### 模式流转
```
Menu（主菜单）
├── Learn（字卡学习）→ LearnDone（学习完成）
├── QuizSettings（测验设置）→ QuizPlay（答题）→ QuizResult（结果）
├── ListenQuizSettings → ListenQuiz（九宫格游戏）→ ListenResult（结果）
└── WrongList（易错字表）→ 可发起专项测验
```

#### 核心数据结构
```typescript
interface CharItem {
  char: string;           // 汉字
  readings: CharReading[];// 读音(支持多音字)
  groupId: string;        // 所属分组 (p1~p25)
  explain?: string;       // 解释
}

interface CharRecord {
  right: number;          // 累计正确次数
  wrong: number;          // 累计错误次数
  lastSeen: string;       // ISO 日期
  nextReview: string;     // ISO 日期
  interval: number;       // 遗忘曲线等级 (0~5)，映射 EBBINGHAUS_INTERVALS
}
```

#### 智能出题算法（`generateQuiz`）
按比例分配出题，替代了之前的纯随机：

| 优先级 | 类别 | 条件 | 占比 |
|--------|------|------|------|
| 1 | 易错字 | 正确率 < 50% 且答题 ≥ 3 次 | ~40% |
| 2 | 遗忘曲线到期 | nextReview ≤ 今天 | ~30% |
| 3 | 新字 | 从未答题 | ~20% |
| 4 | 随机补充 | 其余字 | ~10% |

#### 遗忘曲线（`recordAnswerLocal`）
```
EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15, 30] 天
level:                   0  1  2  3   4   5

答对 → level + 1, nextReview = today + intervals[level]
答错 → level = 0, nextReview = today + 1
level 5 答对 → mastered = true
```

#### 易错字表（`WrongList` 组件）
- 筛选：正确率 < 50% 且答题次数 ≥ 3
- 展示：字 + 正确率进度条 + 错误/总次数 + 发音按钮
- 可发起专项测验（只出易错字）

#### 语音系统 (TTS + 预录音频)
- 优先使用预录 MP3 → 回退到 Web Speech API
- 全局中断机制：`_abortId` 递增
- 音效：AudioContext 合成

### 5.4 绘本馆 (`/picture-books` → 650 行)

- 书架 → 阅读器，音频逐字高亮，自动翻页
- RequireAuth 守卫
- 目前 1 本书：《小白兔找萝卜》

### 5.5 地产权思维导图 (`/property-law` → 387 行)

- ECharts tree 图表，响应式双端布局
- RequireAuth 守卫

---

## 6. 关键类型定义速查

```typescript
// src/data/tools.ts
interface Tool { id, title, description, href, icon: string, category: "law"|"kids"|"other", tags }

// src/data/characters.ts
interface CharItem { char, readings: CharReading[], groupId, explain? }
interface CharReading { pinyin, words: string[], emoji }
interface CharGroup { id, name, chars: CharItem[] }

// chinese-literacy (内联在 page.tsx)
interface CharRecord { right, wrong, lastSeen, nextReview, interval }
// interval 现在是 level (0~5)，不再是天数

// src/lib/auth-context.tsx
interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

// Supabase tables
// profiles: { id (UUID, PK), nickname, avatar_url, created_at, updated_at }
// game_stats: { user_id, game_id, total_days, streak_days, last_played_at, mastered_count, total_attempts, correct_attempts }
// literacy_records: { user_id, char, right_count, wrong_count, level, last_seen, next_review, mastered }
// literacy_progress: { user_id, char, learned_at }
```

---

## 7. 构建与运行

```bash
npm install          # 安装依赖
npm run dev          # 开发模式 (Turbopack) → http://localhost:3000
npm run build        # 生产构建
npm start            # 启动生产服务
npm run lint         # 代码检查
```

### 环境变量（`.env.local`，不入库）
```
NEXT_PUBLIC_SUPABASE_URL=https://wdfzzkrcvflkwqyacofl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...（anon public key）
```

### Supabase 配置
- **Auth Providers**: Google OAuth + Email (Magic Link)
- **Google OAuth 回调地址**: `https://<项目ID>.supabase.co/auth/v1/callback`
- **RLS**: 所有表已启用 Row Level Security

---

## 8. 开发约定与注意事项

### 8.1 新增工具的标准流程

1. 在 `src/data/tools.ts` 添加工具条目
2. 创建 `src/app/<tool-id>/page.tsx`，顶部加 `"use client"`
3. 用 `RequireAuth` 包裹页面组件
4. 如需存储用户数据，在 Supabase 创建独立表（如 `math_records`）
5. 首页自动展示，无需额外修改

### 8.2 新增游戏数据表的规范

每个游戏有独立的 Supabase 表，按游戏形态设计字段：
- 表名格式：`<game>_records`（如 `literacy_records`, `math_records`）
- 必须包含 `user_id UUID REFERENCES auth.users(id)` 字段
- 必须启用 RLS，策略：用户只能访问自己的数据
- 排行榜数据统一写入 `game_stats` 表，用 `game_id` 区分

### 8.3 编码风格

- 每个工具页面为单文件组件（子组件、hooks、工具函数都在同一文件）
- 共享基础设施放 `src/lib/`
- CSS: 纯 Tailwind 原子类
- 所有游戏页面用 `RequireAuth` 包裹

### 8.4 Next.js 16 注意事项

- **Turbopack** 默认构建器
- **App Router only**
- `useSearchParams()` 必须在 `<Suspense>` 内使用
- 编码前建议阅读: `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`

### 8.5 已知的技术债/改进空间

- `chinese-literacy/page.tsx` 有 2133 行，可考虑拆分
- 绘本馆只有 1 本书
- `game_stats` 排行榜表已建好但功能未实现（Phase 3）
- 无单元测试 / E2E 测试
- 无 CI/CD 配置

---

## 9. Git 提交历史摘要 (近期)

```
255e086 docs: 添加项目框架文档 PROJECT_GUIDE.md
0f79897 feat: 优化出题范围选择，快捷按钮+单击微调
66ac75d feat: 测验结果页显示出题范围和测验内容总结
4410ea0 feat: 新增听音选字九宫格游戏模式
f708637 feat: 统一抽象字语音为预录音频，翻页停止播放
8376c5d feat: spaced repetition quiz + abstract char explanations
05e0db3 feat: picture book reader with audio narration, word highlighting, vocab popups
```

提交风格: `feat:` / `fix:` / `chore:` / `docs:` 前缀。

---

## 10. 快速索引

| 需求 | 找哪个文件 |
|------|-----------|
| 添加新工具到首页 | `src/data/tools.ts` |
| 修改首页布局/头像 | `src/app/page.tsx` |
| 修改登录页 | `src/app/login/page.tsx` |
| 修改认证逻辑 | `src/lib/auth-context.tsx` |
| 修改登录守卫 | `src/lib/require-auth.tsx` |
| 修改数据迁移 | `src/lib/migrate-local-data.ts` |
| Supabase 客户端配置 | `src/lib/supabase.ts` + `.env.local` |
| 修改全局样式/字体 | `src/app/globals.css` + `src/app/layout.tsx` |
| 添加/修改汉字数据 | `src/data/characters.ts` |
| 修改识字学习/测验逻辑 | `src/app/chinese-literacy/page.tsx` |
| 修改智能出题算法 | 同上，搜索 `generateQuiz` 函数 |
| 修改遗忘曲线算法 | 同上，搜索 `recordAnswerLocal` 和 `EBBINGHAUS_INTERVALS` |
| 修改易错字表 | 同上，搜索 `WrongList` 组件 |
| 修改绘本功能 | `src/app/picture-books/page.tsx` |
| 修改思维导图 | `src/app/property-law/page.tsx` |
| 新增游戏数据表 | Supabase SQL Editor，参考 `literacy_records` 表结构 |
| 排行榜功能（待开发） | `game_stats` 表已建好，需实现前端 |
| Next.js 配置 | `next.config.mjs` |

---

## 11. 未来规划

| 阶段 | 功能 | 状态 |
|------|------|------|
| Phase 1 | 用户系统 (Supabase Auth + DB) | ✅ 已完成 |
| Phase 2 | 智能出题 + 遗忘曲线 + 易错字表 | ✅ 已完成 |
| Phase 3 | 排行榜 (打卡天数/掌握数量/正确率，周榜/月榜/总榜) | 📋 待开发，`game_stats` 表已预留 |
| Phase 4+ | 数学游戏、阅读游戏等新模块 | 📋 规划中 |
