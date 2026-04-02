export interface CharReading {
  pinyin: string;
  words: string[];
  /** Path to pre-recorded audio for this reading (polyphonic chars only) */
  audio?: string;
}

export interface CharItem {
  char: string;
  readings: CharReading[];
  emoji: string;
  groupId: string;
}

export interface CharGroup {
  id: string;
  name: string;
  chars: CharItem[];
}

const g1: CharItem[] = [
  { char: "一", readings: [{ pinyin: "yī", words: ["一个", "一天"] }], emoji: "1️⃣", groupId: "g1" },
  { char: "二", readings: [{ pinyin: "èr", words: ["二月", "第二"] }], emoji: "2️⃣", groupId: "g1" },
  { char: "三", readings: [{ pinyin: "sān", words: ["三个", "三月"] }], emoji: "3️⃣", groupId: "g1" },
  { char: "十", readings: [{ pinyin: "shí", words: ["十个", "十月"] }], emoji: "🔟", groupId: "g1" },
  { char: "人", readings: [{ pinyin: "rén", words: ["人民", "大人"] }], emoji: "🧑", groupId: "g1" },
  { char: "入", readings: [{ pinyin: "rù", words: ["进入", "入口"] }], emoji: "🚪", groupId: "g1" },
  { char: "八", readings: [{ pinyin: "bā", words: ["八个", "八月"] }], emoji: "8️⃣", groupId: "g1" },
  { char: "大", readings: [
    { pinyin: "dà", words: ["大小", "大人"], audio: "/audio/大-da4.mp3" },
    { pinyin: "dài", words: ["大夫"], audio: "/audio/大-dai4.mp3" },
  ], emoji: "🐘", groupId: "g1" },
  { char: "小", readings: [{ pinyin: "xiǎo", words: ["小鸟", "大小"] }], emoji: "🐜", groupId: "g1" },
  { char: "口", readings: [{ pinyin: "kǒu", words: ["口水", "入口"] }], emoji: "👄", groupId: "g1" },
];

const g2: CharItem[] = [
  { char: "儿", readings: [{ pinyin: "ér", words: ["儿子", "女儿"] }], emoji: "👦", groupId: "g2" },
  { char: "了", readings: [
    { pinyin: "le", words: ["好了", "来了"], audio: "/audio/了-le.mp3" },
    { pinyin: "liǎo", words: ["了解", "了不起"], audio: "/audio/了-liao3.mp3" },
  ], emoji: "✅", groupId: "g2" },
  { char: "子", readings: [
    { pinyin: "zǐ", words: ["子女", "子弹"], audio: "/audio/子-zi3.mp3" },
    { pinyin: "zi", words: ["儿子", "桌子"], audio: "/audio/子-zi0.mp3" },
  ], emoji: "👶", groupId: "g2" },
  { char: "女", readings: [{ pinyin: "nǚ", words: ["女儿", "子女"] }], emoji: "👧", groupId: "g2" },
  { char: "又", readings: [{ pinyin: "yòu", words: ["又大", "又来"] }], emoji: "🔄", groupId: "g2" },
  { char: "不", readings: [{ pinyin: "bù", words: ["不好", "不大"] }], emoji: "🚫", groupId: "g2" },
  { char: "日", readings: [{ pinyin: "rì", words: ["日月", "日子"] }], emoji: "☀️", groupId: "g2" },
  { char: "月", readings: [{ pinyin: "yuè", words: ["月亮", "日月"] }], emoji: "🌙", groupId: "g2" },
  { char: "水", readings: [{ pinyin: "shuǐ", words: ["水果", "口水"] }], emoji: "💧", groupId: "g2" },
  { char: "火", readings: [{ pinyin: "huǒ", words: ["火车", "大火"] }], emoji: "🔥", groupId: "g2" },
];

const g3: CharItem[] = [
  { char: "山", readings: [{ pinyin: "shān", words: ["山上", "大山"] }], emoji: "⛰️", groupId: "g3" },
  { char: "石", readings: [
    { pinyin: "shí", words: ["石头", "山石"], audio: "/audio/石-shi2.mp3" },
    { pinyin: "dàn", words: ["一石米"], audio: "/audio/石-dan4.mp3" },
  ], emoji: "🪨", groupId: "g3" },
  { char: "田", readings: [{ pinyin: "tián", words: ["田地", "水田"] }], emoji: "🌾", groupId: "g3" },
  { char: "土", readings: [{ pinyin: "tǔ", words: ["土地", "泥土"] }], emoji: "🟤", groupId: "g3" },
  { char: "木", readings: [{ pinyin: "mù", words: ["木头", "树木"] }], emoji: "🌳", groupId: "g3" },
  { char: "禾", readings: [{ pinyin: "hé", words: ["禾苗", "禾田"] }], emoji: "🌿", groupId: "g3" },
  { char: "米", readings: [{ pinyin: "mǐ", words: ["大米", "米饭"] }], emoji: "🍚", groupId: "g3" },
  { char: "白", readings: [{ pinyin: "bái", words: ["白天", "白云"] }], emoji: "⬜", groupId: "g3" },
  { char: "云", readings: [{ pinyin: "yún", words: ["白云", "云朵"] }], emoji: "☁️", groupId: "g3" },
  { char: "天", readings: [{ pinyin: "tiān", words: ["天上", "白天"] }], emoji: "🌤️", groupId: "g3" },
];

const g4: CharItem[] = [
  { char: "上", readings: [
    { pinyin: "shàng", words: ["上下", "上山"], audio: "/audio/上-shang4.mp3" },
    { pinyin: "shǎng", words: ["上声"], audio: "/audio/上-shang3.mp3" },
  ], emoji: "⬆️", groupId: "g4" },
  { char: "下", readings: [{ pinyin: "xià", words: ["上下", "下山"] }], emoji: "⬇️", groupId: "g4" },
  { char: "左", readings: [{ pinyin: "zuǒ", words: ["左右", "左手"] }], emoji: "⬅️", groupId: "g4" },
  { char: "右", readings: [{ pinyin: "yòu", words: ["左右", "右手"] }], emoji: "➡️", groupId: "g4" },
  { char: "前", readings: [{ pinyin: "qián", words: ["前后", "前面"] }], emoji: "🔜", groupId: "g4" },
  { char: "后", readings: [{ pinyin: "hòu", words: ["前后", "后面"] }], emoji: "🔙", groupId: "g4" },
  { char: "里", readings: [
    { pinyin: "lǐ", words: ["里面", "里外"], audio: "/audio/里-li3.mp3" },
    { pinyin: "li", words: ["哪里", "这里"], audio: "/audio/里-li0.mp3" },
  ], emoji: "📦", groupId: "g4" },
  { char: "外", readings: [{ pinyin: "wài", words: ["外面", "里外"] }], emoji: "🏞️", groupId: "g4" },
  { char: "多", readings: [{ pinyin: "duō", words: ["多少", "很多"] }], emoji: "➕", groupId: "g4" },
  { char: "少", readings: [
    { pinyin: "shǎo", words: ["多少", "少量"], audio: "/audio/少-shao3.mp3" },
    { pinyin: "shào", words: ["少年", "少爷"], audio: "/audio/少-shao4.mp3" },
  ], emoji: "➖", groupId: "g4" },
];

const g5: CharItem[] = [
  { char: "开", readings: [{ pinyin: "kāi", words: ["开门", "开心"] }], emoji: "🔓", groupId: "g5" },
  { char: "关", readings: [{ pinyin: "guān", words: ["关门", "开关"] }], emoji: "🔒", groupId: "g5" },
  { char: "来", readings: [{ pinyin: "lái", words: ["来去", "过来"] }], emoji: "🏃", groupId: "g5" },
  { char: "去", readings: [{ pinyin: "qù", words: ["来去", "出去"] }], emoji: "🚶", groupId: "g5" },
  { char: "出", readings: [{ pinyin: "chū", words: ["出来", "出去"] }], emoji: "📤", groupId: "g5" },
  { char: "见", readings: [
    { pinyin: "jiàn", words: ["看见", "再见"], audio: "/audio/见-jian4.mp3" },
    { pinyin: "xiàn", words: ["出现"], audio: "/audio/见-xian4.mp3" },
  ], emoji: "👀", groupId: "g5" },
  { char: "目", readings: [{ pinyin: "mù", words: ["目光", "耳目"] }], emoji: "👁️", groupId: "g5" },
  { char: "耳", readings: [{ pinyin: "ěr", words: ["耳朵", "耳目"] }], emoji: "👂", groupId: "g5" },
];

export const charGroups: CharGroup[] = [
  { id: "g1", name: "数字基础", chars: g1 },
  { id: "g2", name: "常用字", chars: g2 },
  { id: "g3", name: "自然万物", chars: g3 },
  { id: "g4", name: "方位数量", chars: g4 },
  { id: "g5", name: "动作感官", chars: g5 },
];

export const allChars: CharItem[] = charGroups.flatMap((g) => g.chars);
