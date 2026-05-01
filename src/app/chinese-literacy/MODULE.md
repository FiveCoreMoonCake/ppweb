# 中文识字模块

> 路由: `/chinese-literacy` | 面向学龄前儿童
> 字卡学习 + 智能测验 + 九宫格游戏 + 易混字对比 + 搭配词卡 + 易错字表 + 历史结果

---

## 文件结构

```
chinese-literacy/
├── page.tsx                    # 主页面 (~240行): 模式路由 + 全局状态 + 历史加载
├── MODULE.md                   # 本文档
├── lib/                        # 纯逻辑层
│   ├── types.ts                # 共享类型 (CharRecord, QuizQuestion, Mode 等)
│   ├── shuffle.ts              # Fisher-Yates 洗牌
│   ├── voice.ts                # TTS/预录音频系统
│   ├── confusables.ts          # 易混字对比数据 (35组)
│   ├── word-pairs.ts           # 搭配词数据 (14组)
│   ├── supabase-progress.ts    # Supabase 数据持久化（含 clearProgressChars）
│   ├── quiz-history.ts         # 听音选字/九格历史记录 (localStorage, 最近3次)
│   ├── spaced-repetition.ts    # 遗忘曲线算法
│   ├── sound-effects.ts        # 音效合成
│   └── quiz-engine.ts          # 智能出题引擎（听音选字 + 九格顺选）
└── components/                 # UI 组件层
    ├── CharCard.tsx             # 字卡 + 彩色拼音 (声母红/韵母蓝) + splitPinyin
    ├── CompareCard.tsx          # 易混字对比卡
    ├── WordPairCard.tsx         # 搭配词卡
    ├── LearnMode.tsx            # 学习模式 (翻卡 + 分组导航 + 搭配词/易混字 + 重学本期)
    ├── GroupRangeSelector.tsx   # 出题范围选择器（听音选字 / 九格顺选共享）
    ├── QuizSettings.tsx         # 听音选字设置
    ├── QuizPlay.tsx             # 听音选字答题 (2×2 选项 + 前后翻页 + 错题门禁)
    ├── QuizResults.tsx          # 听音选字结果 (拼音 + 期号标记 + 可点击发音，支持只读模式)
    ├── ListenQuizSettings.tsx   # 九格顺选设置（支持出题范围）
    ├── ListenQuizPlay.tsx       # 九格顺选 3×3 游戏
    ├── ListenQuizResults.tsx    # 九格顺选结果 (拼音 + 期号标记 + 可点击发音，支持只读模式)
    ├── QuizHistory.tsx          # 历史结果列表 (tab: 听音选字/九格)
    └── WrongList.tsx            # 易错字表 + 专项练习
```

## 模式流转

```
Home（首页 5 张卡片）
├── 🎴 学习模式 Learn（可「重学本期」清空单期已学记录）
├── 🧩 听音选字 QuizSettings → QuizPlay → QuizResults →历史
├── 🎮 九格顺选 ListenQuizSettings → ListenQuizPlay → ListenQuizResults →历史
├── 📋 易错字表 WrongList → 可发起专项听音选字
└── 🕑 历史结果 History → 只读 Results（返回历史）
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

**出题范围**：两种模式
- **已学内容**（默认）：使用 `progress`（已学字集合）
- **按课选择**：选定期号后仅从该范围出题。在 by-group 模式下增加了 **范围保护守卫**：题目、干扰项、全局兑底均严格限制于选定 `groupIds`，防止题目超出范围。`generateListenGrid` 同样接收可选 `groupIds`。

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
  - 🛡️ **孤儿字白名单保护**：只有同时存在于 `characters.ts` 全局字库中的搭档字才会被写入 Supabase。修复了「认识」的「认」、「害怕」的「害」等不在数据集中的字被错误计入学习进度，导致已学字数异常（如 301/300）的 Bug。
  - 🧹 **自动清理孤儿数据**：`page.tsx` 与 `LearnMode.tsx` 加载 `progress` 后会扫描不在 `allChars` 中的字符，调用 `clearProgressChars` 一次性从 `literacy_progress` + `literacy_records` 中删除（修历史脏数据）。
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

筛选正确率 < 50% 且答题 ≥ 3 次的字，可发起专项听音选字。
- 每个错字卡片大字下方显示所属的「第N期」灰色小标签（与听音选字 / 九格答题中字卡的标记一致），便于溯源是否超出选定出题范围。

## 重学本期 (LearnMode 中的 重学本期 按钮)

- 在学习模式项目标题下方可见，仅当本期存在已学记录时出现。
- 点击后弹窗确认。确认后：删除该期所有字的 `literacy_progress` 和 `literacy_records` 记录（`clearProgressChars`）。
- 重学后该期字会以“新字”身份重新进入智能出题。

---

## 测验答题增强 (`QuizPlay.tsx`)

**双向翻页**：
- 底部"上一题 / 下一题"按钮 + 键盘 ← →
- 进度条 = 已答题数 / 总数（不再因当前题答完推进）
- 答题状态按题目索引持久化（`answerMap[]` + `tappedMap[]`）
- 回看已答题时不可修改（防刷 SR 数据），自动播报只在**首次**访问未答题时触发

**错题强制听读音门禁**：
- 答错后"下一题"按钮置灰，必须**点过错选字和正确字**两张卡（听过读音）才会激活
- 两张卡有琥珀色脉冲描边提示需点击
- 提示文案变黄："点一点两个字，听听读音再继续"
- 答对则无门禁，按钮直接绿色可用

## 历史结果 (`QuizHistory.tsx` + `lib/quiz-history.ts`)

**存储策略**：
- localStorage，key 格式 `cl:quizHistory:{userId}` / `cl:listenHistory:{userId}`
- 每种模式**最多保留 3 次**（FIFO 淘汰）
- 测验/九格完成时 `onFinish` 自动写入，失败静默降级

**数据类型**：
```typescript
interface QuizHistoryEntry { timestamp: number; answers: QuizAnswer[] }
interface ListenHistoryEntry { timestamp: number; result: ListenQuizResult; grid: CharItem[] }
```

**查看**：
- 首页"🕑 历史结果"卡片进入，tab 切换测验 / 九格顺选
- 列表项显示相对时间（今天/昨天/日期）、得分 或 错误次数、错字徽章预览
- 点列表项 → 复用 `QuizResults` / `ListenQuizResults` 组件
- **只读模式**：两个 Results 组件均支持可选 `onRetry?` + `backLabel?` props，未传 `onRetry` 时隐藏"再来一次"按钮

## 拼音显示 (`CharCard.tsx` — `splitPinyin` + `PinyinText`)

从 `CharCard` 导出供所有字卡组件复用：
- `PINYIN_INITIALS` — 23 个声母数组，按长度降序（zh/ch/sh 优先于 z/c/s）
- `splitPinyin(pinyin)` — 最长前缀匹配拆分 `{initial, final}`，声调保留在韵母
- `<PinyinText pinyin className?>` — 声母 `text-rose-500`、韵母 `text-sky-600`
- 应用于 `CharCard`、`WordPairCard`、`CompareCard` 三处
