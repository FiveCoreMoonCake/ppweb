# PP 学习工具箱 - 项目框架文档

> AI Agent 快速上手指南。各模块详情见对应 MODULE.md / AUTH.md，按需阅读。
> 最后更新: 2026-04-21

---

## 1. 项目概述

交互式学习工具合集 Web 应用，前端 + Supabase BaaS。

| 模块 | 路由 | 详细文档 |
|------|------|----------|
| 中文识字 | `/chinese-literacy` | `src/app/chinese-literacy/MODULE.md` |
| 绘本馆 | `/picture-books` | `src/app/picture-books/MODULE.md` |
| 地产权思维导图 | `/property-law` | `src/app/property-law/MODULE.md` |
| 认证系统 | `/login` + `src/lib/` | `src/lib/AUTH.md` |

---

## 2. 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 16 |
| UI | React | 19 |
| 语言 | TypeScript (strict) | 5+ |
| 样式 | Tailwind CSS | 4 |
| 动画 | Framer Motion | 12 |
| 图标 | Lucide React | 1.7 |
| 图表 | ECharts | 6 |
| 后端 | Supabase (Auth + PostgreSQL) | @supabase/supabase-js |
| 构建 | Turbopack | - |

**⚠️ Next.js 16** 与旧版有重大变化，编码前读 `node_modules/next/dist/docs/`。

---

## 3. 目录结构

```
ppweb/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # 根布局 (AuthProvider)
│   │   ├── page.tsx                  # 首页 (工具列表 + 登录状态)
│   │   ├── globals.css               # Tailwind v4 全局样式
│   │   ├── login/page.tsx            # 登录页 (邮箱密码 + Google OAuth)
│   │   ├── chinese-literacy/         # 识字模块 → MODULE.md
│   │   ├── picture-books/            # 绘本馆 → MODULE.md
│   │   ├── property-law/             # 地产权 → MODULE.md
│   │   └── article/page.mdx          # MDX demo
│   ├── lib/                          # 共享: auth + supabase → AUTH.md
│   └── data/                         # 静态数据 (characters/tools/property-law)
├── public/
│   ├── audio/                        # 汉字发音 MP3 (600+ 文件) + manifest.json
│   └── books/                        # 绘本数据
├── scripts/                          # 音频/数据生成脚本
└── CLAUDE.md / AGENTS.md             # Agent 约束
```

---

## 4. Supabase 数据

**表结构：**

| 表名 | 用途 | RLS |
|------|------|-----|
| `profiles` | 用户信息 | 所有人可读，本人可写 |
| `game_stats` | 排行榜（预留） | 所有人可读，本人可写 |
| `literacy_records` | 每字学习记录 | 本人可读写 |
| `literacy_progress` | 已浏览的字 | 本人可读写 |

```sql
-- literacy_records
(user_id, char, right_count, wrong_count, level, last_seen, next_review, mastered)
-- UNIQUE(user_id, char), level 0~5

-- literacy_progress
(user_id, char, learned_at)

-- game_stats (预留)
(user_id, game_id, total_days, streak_days, last_played_at, mastered_count, total_attempts, correct_attempts)
```

**客户端**：`src/lib/supabase.ts` 使用 Proxy 懒初始化，防 SSR 构建崩溃。

---

## 5. 构建与运行

```bash
npm install && npm run dev    # → http://localhost:3000
npm run build && npm start    # 生产
```

### 环境变量 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### Vercel 部署
- 环境变量在 Vercel Dashboard 添加
- Supabase Redirect URLs 添加 `https://your-domain/**`
- 修改环境变量后需手动 Redeploy

---

## 6. 开发约定

### 新增工具
1. `src/data/tools.ts` 添加条目
2. `src/app/<id>/page.tsx`，顶部 `"use client"`
3. `RequireAuth` 包裹
4. 如需数据表，在 Supabase 创建（RLS + `user_id`）

### 编码风格
- Tailwind 原子类，无组件库
- 配色：slate 基底，indigo 强调，rose 错误
- 所有页面 Client Component（`"use client"`）
- `useSearchParams()` 必须在 `<Suspense>` 内

### 数据表规范
- 表名：`<game>_records`
- 必须 `user_id UUID REFERENCES auth.users(id)` + RLS
- 排行榜统一 `game_stats` 表

---

## 7. 快速索引

| 需求 | 文件 |
|------|------|
| 首页布局 | `src/app/page.tsx` |
| 登录/注册/密码重置 | `src/app/login/page.tsx` → 详见 `src/lib/AUTH.md` |
| 认证逻辑 | `src/lib/auth-context.tsx` |
| 工具注册 | `src/data/tools.ts` |
| 汉字数据 | `src/data/characters.ts` |
| 识字模块全部 | `src/app/chinese-literacy/` → 详见 `MODULE.md` |
| 绘本馆 | `src/app/picture-books/` → 详见 `MODULE.md` |
| 地产权 | `src/app/property-law/` → 详见 `MODULE.md` |
| Supabase 客户端 | `src/lib/supabase.ts` |
| 全局样式 | `src/app/globals.css` |
| Next.js 配置 | `next.config.mjs` |

---

## 8. 路线图

| 阶段 | 功能 | 状态 |
|------|------|------|
| Phase 1 | 用户系统 (Supabase Auth + DB) | ✅ |
| Phase 2 | 智能出题 + 遗忘曲线 + 易错字表 | ✅ |
| Phase 2.7 | 防作弊出题 + 模块化拆分 | ✅ |
| Phase 2.8 | 易混字对比卡 + 搭配词卡 + 九格顺选智能出题 | ✅ |
| Phase 2.9 | 邮箱密码注册登录 + 密码重置 | ✅ |
| Phase 2.5 | 绘本馆 v2 — 点读笔交互 | 🔧 代码完成 |
| Phase 2.6 | 绘本生产 Pipeline | 📋 待实施 |
| Phase 3 | 排行榜 | 📋 表已建 |
| Phase 4+ | 数学/阅读等新模块 | 📋 规划中 |

---

## 9. Git 提交风格

`feat:` / `fix:` / `chore:` / `docs:` / `assets:` 前缀
