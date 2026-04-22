# 中文识字模块

> 路由: `/chinese-literacy` | 面向学龄前儿童
> 字卡学习 + 智能测验 + 九宫格游戏 + 易混字对比 + 搭配词卡 + 易错字表

---

## 文件结构

```
chinese-literacy/
├── page.tsx                    # 主页面 (~210行): 模式路由 + 全局状态
├── MODULE.md                   # 本文档
├── lib/                        # 纯逻辑层
│   ├── types.ts                # 共享类型 (CharRecord, QuizQuestion 等)
│   ├── shuffle.ts              # Fisher-Yates 洗牌
│   ├── voice.ts                # TTS/预录音频系统
│   ├── confusables.ts          # 易混字对比数据 (35组)
│   ├── word-pairs.ts           # 搭配词数据 (14组，抽象字/拆开无意义字)
│   ├── supabase-progress.ts    # Supabase 数据持久化
│   ├── spaced-repetition.ts    # 遗忘曲线算法
│   ├── sound-effects.ts        # 音效合成
│   └── quiz-engine.ts          # 智能出题引擎
└── components/                 # UI 组件层
    ├── CharCard.tsx             # 字卡 (Emoji + 朗读)
    ├── CompareCard.tsx          # 易混字对比卡 (并排对比 + 记忆提示)
    ├── WordPairCard.tsx         # 搭配词卡 (词+双字卡 + 点击读详细)
    ├── LearnMode.tsx            # 学习模式 (翻卡 + 分组导航 + 搭配词/易混字)
    ├── QuizSettings.tsx         # 测验设置
    ├── QuizPlay.tsx             # 测验答题 (2×2 选项)
    ├── QuizResults.tsx          # 测验结果
    ├── ListenQuizSettings.tsx   # 九格顺选设置
    ├── ListenQuizPlay.tsx       # 九格顺选 3×3 游戏
    ├── ListenQuizResults.tsx    # 九格顺选结果
    └── WrongList.tsx            # 易错字表 + 专项练习
```

## 模式流转

```
Menu（主菜单）
├── Learn（字卡学习）→ LearnDone（学习完成）
├── QuizSettings（测验设置）→ QuizPlay（答题）→ QuizResult（结果）
├── ListenQuizSettings → ListenQuiz（九宫格游戏）→ ListenResult（结果）
└── WrongList（易错字表）→ 可发起专项测验
```

---

## 核心数据结构

```typescript
// lib/types.ts
interface CharRecord {
  right: number;          // 累计正确次数
  wrong: number;          // 累计错误次数
  lastSeen: string;       // ISO 日期
  nextReview: string;     // ISO 日期
  interval: number;       // 遗忘曲线等级 (0~5)，映射 EBBINGHAUS_INTERVALS
}

// src/data/characters.ts
interface CharItem { char, readings: CharReading[], groupId, explain? }
interface CharReading { pinyin, words: string[], emoji }
interface CharGroup { id, name, chars: CharItem[] }
// 500+ 字分 25 组，分组顺序不可随意调整（影响已学进度）
```

---

## 智能出题算法 (`quiz-engine.ts` — `generateQuiz`)

**防作弊优先级设计**：孩子可能故意答错已会的字，试图让测验变简单。算法通过反转优先级防止这种策略：

| 优先级 | 类别 | 条件 | 占比 |
|--------|------|------|------|
| 1 | **新字** | 已学但从未答题 | **40%** |
| 2 | 到期复习 | nextReview ≤ 今天 | 25% |
| 3 | 易错字 | 正确率 < 50% 且答题 ≥ 3 | 25% |
| 4 | 随机补充 | 其余字 | 10% |

**出题范围**：自动使用 `progress`（已学字集合），无需手动选组。

**技术细节**：
- **Level 降权**：易错字桶内按 level 升序排列，level 0 优先
- **干扰项**：优先同组字 → 其他组补充 → 全局字库兜底
- **分配精度**：`Math.floor` + 余数分配，防溢出
- **去重**：前向+后向交换，确保连续题目不重复

---

## 遗忘曲线 (`spaced-repetition.ts`)

```
EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15, 30] 天
level:                   0  1  2  3   4   5

答对 → level + 1, nextReview = today + intervals[level]
答错 → level = max(0, level - 2)  // 柔性衰减
level 5 答对 → mastered = true
```

---

## 搭配词卡 (`word-pairs.ts` + `WordPairCard.tsx`)

**设计原则**：
- **只配对真正抽象的字**（喜、欢、朋、友…），或**拆开无意义**的字（蝴、蝶）
- **避免多音字混淆**：不引入无关读音
- 搭配词卡**一页同时显示两个字**，同组相邻的配对字翻页时自动跳过

当前 14 组：
- 情感/认知：喜欢、害怕、朋友、知道、认识、自己、向往、愿意、可以、告诉
- 方位/事物：东西
- 生物（拆开无意义）：蝴蝶、蚂蚁、蜜蜂

**LearnMode 行为**（关键）：
- 当配对两字在同一组相邻时，`next()` / `prev()` 自动跳过配对字，避免词组卡重复
- 查看词组卡时，**两个字同时标记为已学**（`learned` set 一次加两个）
- 易混字对比按钮会**过滤掉与当前词组重叠的易混字对**（如看"朋友"时不显示朋↔友对比）

**音频**：`wp_{word}.mp3` + `{char}_in_{word}.mp3` — Azure Speech XiaoxiaoNeural，SSML break 250ms/300ms（停顿紧凑）

---

## 易混字对比 (`confusables.ts` + `CompareCard.tsx`)

35 组形近字/配对字/偏旁字，LearnMode 中按钮切换显示。

---

## 语音系统 (`voice.ts`)

- 预录音频：Azure Speech / Edge TTS，`zh-CN-XiaoxiaoNeural`
- `public/audio/` + `manifest.json` 索引
- 单音字：`{char}.mp3`，多音字：`{char}-{pinyin}.mp3`
- 搭配词：`wp_{word}.mp3` + `{char}_in_{word}.mp3`
- Web Speech API 仅作 fallback
- `_abortId` 递增中断机制

## 音频生成脚本 (`scripts/`)

| 脚本 | 用途 | 引擎 |
|------|------|------|
| `gen_audio.py` | 单字发音 | Edge TTS / Azure SSML |
| `gen_explain_audio.py` | explain 字 | Edge TTS |
| `gen_word_pair_audio.py` | 搭配词音频 | Azure REST API |
| `gen_book_audio.py` | 绘本语音 | Azure Speech SDK |

```bash
export AZURE_SPEECH_KEY=<key>
export AZURE_SPEECH_REGION=eastus
```

## 音效 (`sound-effects.ts`)

AudioContext 合成：答对/答错/胜利，无外部文件。

## 易错字表 (`WrongList.tsx`)

筛选正确率 < 50% 且答题 ≥ 3 次的字，可发起专项测验。
