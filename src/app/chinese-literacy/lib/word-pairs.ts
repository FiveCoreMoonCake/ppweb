/**
 * Word pairs — common two-character words where learning the chars together
 * makes both easier to understand (e.g., 喜+欢 = 喜欢).
 *
 * Purpose: aid memorization by teaching abstract chars through familiar words.
 * Different from confusables.ts which prevents confusion between similar chars.
 *
 * Audio contract:
 *   - "wp_{word}.mp3"           → reads the word (e.g., "喜欢")
 *   - "{char}_in_{word}.mp3"    → reads "字，X的字。Y的字。释义"
 *   Pre-recorded via Azure Speech (XiaoxiaoNeural).
 *   Falls back to browser TTS if MP3 not in manifest.
 */

export interface CharContext {
  /** "X的字" style phrases, e.g. ["喜欢的喜", "欢喜的喜"] */
  phrases: string[];
  /** Short meaning explanation for the char */
  meaning: string;
}

export interface WordPair {
  /** The two-character word */
  word: string;
  /** The two characters that form the word (ordered) */
  chars: [string, string];
  /** Emoji representing the word */
  emoji: string;
  /** Optional sentence-level explanation of the word (for abstract words) */
  explain?: string;
  /** Context for each char: phrases + meaning */
  charContexts: [CharContext, CharContext];
}

export const wordPairs: WordPair[] = [
  // ── 情感/心理 ──
  {
    word: "喜欢", chars: ["喜", "欢"], emoji: "😊",
    charContexts: [
      { phrases: ["喜欢的喜", "欢喜的喜"], meaning: "表示开心，热爱的意思" },
      { phrases: ["喜欢的欢", "欢乐的欢"], meaning: "高兴开心的样子叫做欢" },
    ],
  },
  {
    word: "开心", chars: ["开", "心"], emoji: "😄",
    charContexts: [
      { phrases: ["开心的开", "开门的开"], meaning: "打开的意思，心打开了就高兴了" },
      { phrases: ["开心的心", "心里的心"], meaning: "心脏，也指心情和感受" },
    ],
  },
  {
    word: "快乐", chars: ["快", "乐"], emoji: "🎉",
    charContexts: [
      { phrases: ["快乐的快", "快速的快"], meaning: "速度快，心里也痛快" },
      { phrases: ["快乐的乐", "音乐的乐"], meaning: "高兴、开心的意思" },
    ],
  },
  {
    word: "害怕", chars: ["害", "怕"], emoji: "😨",
    explain: "遇到危险或可怕的事情，心里很紧张",
    charContexts: [
      { phrases: ["害怕的害", "伤害的害"], meaning: "不好的、有危险的" },
      { phrases: ["害怕的怕", "可怕的怕"], meaning: "心里发慌，紧张的感觉" },
    ],
  },

  // ── 人物/关系 ──
  {
    word: "朋友", chars: ["朋", "友"], emoji: "🤝",
    charContexts: [
      { phrases: ["朋友的朋", "亲朋的朋"], meaning: "朋就是伙伴，好多人在一起" },
      { phrases: ["朋友的友", "友好的友"], meaning: "友就是友好，对人好的意思" },
    ],
  },
  {
    word: "老师", chars: ["老", "师"], emoji: "👩‍🏫",
    charContexts: [
      { phrases: ["老师的老", "老人的老"], meaning: "年纪大的、有经验的" },
      { phrases: ["老师的师", "师父的师"], meaning: "教你本领的人叫做师" },
    ],
  },
  {
    word: "同学", chars: ["同", "学"], emoji: "👫",
    charContexts: [
      { phrases: ["同学的同", "相同的同"], meaning: "一样的、在一起的" },
      { phrases: ["同学的学", "学习的学"], meaning: "读书学知识的意思" },
    ],
  },

  // ── 学习/认知 ──
  {
    word: "学习", chars: ["学", "习"], emoji: "📚",
    charContexts: [
      { phrases: ["学习的学", "学生的学"], meaning: "接受知识，了解新东西" },
      { phrases: ["学习的习", "练习的习"], meaning: "反复练，熟能生巧" },
    ],
  },
  {
    word: "知道", chars: ["知", "道"], emoji: "💡",
    charContexts: [
      { phrases: ["知道的知", "知识的知"], meaning: "了解、明白一件事" },
      { phrases: ["知道的道", "道路的道"], meaning: "道理，也是路的意思" },
    ],
  },
  {
    word: "认识", chars: ["认", "识"], emoji: "🧠",
    explain: "分辨得出来，知道是什么",
    charContexts: [
      { phrases: ["认识的认", "认真的认"], meaning: "仔细看清楚弄明白" },
      { phrases: ["认识的识", "知识的识"], meaning: "区分得出来，懂了" },
    ],
  },
  {
    word: "记住", chars: ["记", "住"], emoji: "📝",
    charContexts: [
      { phrases: ["记住的记", "日记的记"], meaning: "把事情留在脑子里" },
      { phrases: ["记住的住", "住家的住"], meaning: "停在那里，牢牢的" },
    ],
  },

  // ── 日常动作 ──
  {
    word: "吃饭", chars: ["吃", "饭"], emoji: "🍚",
    charContexts: [
      { phrases: ["吃饭的吃", "吃东西的吃"], meaning: "把食物放到嘴巴里" },
      { phrases: ["吃饭的饭", "米饭的饭"], meaning: "煮熟的米，每天吃的主食" },
    ],
  },
  {
    word: "睡觉", chars: ["睡", "觉"], emoji: "😴",
    charContexts: [
      { phrases: ["睡觉的睡", "午睡的睡"], meaning: "闭上眼睛休息" },
      { phrases: ["睡觉的觉", "感觉的觉"], meaning: "觉就是感受，睡觉就是闭眼休息" },
    ],
  },
  {
    word: "起来", chars: ["起", "来"], emoji: "⬆️",
    charContexts: [
      { phrases: ["起来的起", "起床的起"], meaning: "从低处到高处，站起来" },
      { phrases: ["起来的来", "过来的来"], meaning: "朝这边走，到这里" },
    ],
  },
  {
    word: "回家", chars: ["回", "家"], emoji: "🏠",
    charContexts: [
      { phrases: ["回家的回", "回来的回"], meaning: "掉过头，往原来的地方走" },
      { phrases: ["回家的家", "家人的家"], meaning: "一家人住在一起的地方" },
    ],
  },

  // ── 方位/描述 ──
  {
    word: "东西", chars: ["东", "西"], emoji: "🎁",
    explain: "泛指各种物品、事物",
    charContexts: [
      { phrases: ["东西的东", "东方的东"], meaning: "太阳升起的方向" },
      { phrases: ["东西的西", "西方的西"], meaning: "太阳落下的方向" },
    ],
  },
  {
    word: "漂亮", chars: ["漂", "亮"], emoji: "✨",
    charContexts: [
      { phrases: ["漂亮的漂", "漂浮的漂"], meaning: "在水面上飘着，也形容好看" },
      { phrases: ["漂亮的亮", "明亮的亮"], meaning: "有光，亮堂堂的" },
    ],
  },

  // ── 自然/环境 ──
  {
    word: "天气", chars: ["天", "气"], emoji: "🌤️",
    charContexts: [
      { phrases: ["天气的天", "天空的天"], meaning: "头顶上的天空" },
      { phrases: ["天气的气", "空气的气"], meaning: "空气，看不见但能感觉到" },
    ],
  },

  // ── 需要/动作 ──
  {
    word: "可以", chars: ["可", "以"], emoji: "✅",
    explain: "允许、能够的意思",
    charContexts: [
      { phrases: ["可以的可", "可爱的可"], meaning: "允许的、好的" },
      { phrases: ["可以的以", "以后的以"], meaning: "用来、拿来的意思" },
    ],
  },
  {
    word: "愿意", chars: ["愿", "意"], emoji: "🙋",
    explain: "心里想要做某件事",
    charContexts: [
      { phrases: ["愿意的愿", "心愿的愿"], meaning: "心里盼望的，想要的" },
      { phrases: ["愿意的意", "意思的意"], meaning: "心里想的，打算做的" },
    ],
  },
  {
    word: "帮助", chars: ["帮", "助"], emoji: "🤲",
    charContexts: [
      { phrases: ["帮助的帮", "帮忙的帮"], meaning: "给别人出力做事" },
      { phrases: ["帮助的助", "助手的助"], meaning: "在旁边帮一把" },
    ],
  },
  {
    word: "告诉", chars: ["告", "诉"], emoji: "🗣️",
    explain: "把事情说给别人听",
    charContexts: [
      { phrases: ["告诉的告", "告别的告"], meaning: "开口说，让别人知道" },
      { phrases: ["告诉的诉", "诉说的诉"], meaning: "把心里的事说出来" },
    ],
  },

  // ── 生活/场所 ──
  {
    word: "商店", chars: ["商", "店"], emoji: "🏪",
    charContexts: [
      { phrases: ["商店的商", "商量的商"], meaning: "做买卖，交易的意思" },
      { phrases: ["商店的店", "小店的店"], meaning: "卖东西的铺子" },
    ],
  },
  {
    word: "医院", chars: ["医", "院"], emoji: "🏥",
    charContexts: [
      { phrases: ["医院的医", "医生的医"], meaning: "治病的，让身体好起来" },
      { phrases: ["医院的院", "院子的院"], meaning: "有围墙的大房子" },
    ],
  },
];

// ── Lookup ──

const _wordMap = new Map<string, WordPair[]>();
for (const wp of wordPairs) {
  for (const ch of wp.chars) {
    if (!_wordMap.has(ch)) _wordMap.set(ch, []);
    _wordMap.get(ch)!.push(wp);
  }
}

/** Get all word pairs that include this character */
export function getWordPairs(char: string): WordPair[] {
  return _wordMap.get(char) ?? [];
}

/** Get the first word pair for a character (used for primary display) */
export function getPrimaryWordPair(char: string): WordPair | null {
  return _wordMap.get(char)?.[0] ?? null;
}
