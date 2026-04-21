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

/**
 * Only pair characters that are genuinely abstract / hard to explain alone.
 * Concrete, pictographic, or self-evident chars (快 开 吃 回 …) should NOT
 * be paired — they are easier to learn independently.
 *
 * Multi-pronunciation chars (乐 lè/yuè, 觉 jiào/jué, 漂 piāo/piào) are
 * excluded to avoid introducing confusing alternate readings.
 */
export const wordPairs: WordPair[] = [
  // ── 情感/心理 ──
  {
    word: "喜欢", chars: ["喜", "欢"], emoji: "😊",
    charContexts: [
      { phrases: ["喜欢的喜", "欢喜的喜"], meaning: "表示开心，热爱的意思" },
      { phrases: ["喜欢的欢", "欢笑的欢"], meaning: "高兴开心的样子叫做欢" },
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

  // ── 学习/认知 ──
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

  // ── 方位/描述 ──
  {
    word: "东西", chars: ["东", "西"], emoji: "🎁",
    explain: "泛指各种物品、事物",
    charContexts: [
      { phrases: ["东西的东", "东方的东"], meaning: "太阳升起的方向" },
      { phrases: ["东西的西", "西方的西"], meaning: "太阳落下的方向" },
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
    word: "告诉", chars: ["告", "诉"], emoji: "🗣️",
    explain: "把事情说给别人听",
    charContexts: [
      { phrases: ["告诉的告", "告别的告"], meaning: "开口说，让别人知道" },
      { phrases: ["告诉的诉", "诉说的诉"], meaning: "把心里的事说出来" },
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
