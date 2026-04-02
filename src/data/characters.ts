export interface CharItem {
  char: string;
  pinyin: string;
  words: [string, string];
  emoji: string;
  groupId: string;
}

export interface CharGroup {
  id: string;
  name: string;
  chars: CharItem[];
}

const g1: CharItem[] = [
  { char: "一", pinyin: "yī", words: ["一个", "一天"], emoji: "1️⃣", groupId: "g1" },
  { char: "二", pinyin: "èr", words: ["二月", "第二"], emoji: "2️⃣", groupId: "g1" },
  { char: "三", pinyin: "sān", words: ["三个", "三月"], emoji: "3️⃣", groupId: "g1" },
  { char: "十", pinyin: "shí", words: ["十个", "十月"], emoji: "🔟", groupId: "g1" },
  { char: "人", pinyin: "rén", words: ["人民", "大人"], emoji: "🧑", groupId: "g1" },
  { char: "入", pinyin: "rù", words: ["进入", "入口"], emoji: "🚪", groupId: "g1" },
  { char: "八", pinyin: "bā", words: ["八个", "八月"], emoji: "8️⃣", groupId: "g1" },
  { char: "大", pinyin: "dà", words: ["大小", "大人"], emoji: "🐘", groupId: "g1" },
  { char: "小", pinyin: "xiǎo", words: ["小鸟", "大小"], emoji: "🐜", groupId: "g1" },
  { char: "口", pinyin: "kǒu", words: ["口水", "入口"], emoji: "👄", groupId: "g1" },
];

const g2: CharItem[] = [
  { char: "儿", pinyin: "ér", words: ["儿子", "女儿"], emoji: "👦", groupId: "g2" },
  { char: "了", pinyin: "le", words: ["好了", "来了"], emoji: "✅", groupId: "g2" },
  { char: "子", pinyin: "zǐ", words: ["儿子", "子女"], emoji: "👶", groupId: "g2" },
  { char: "女", pinyin: "nǚ", words: ["女儿", "子女"], emoji: "👧", groupId: "g2" },
  { char: "又", pinyin: "yòu", words: ["又大", "又来"], emoji: "🔄", groupId: "g2" },
  { char: "不", pinyin: "bù", words: ["不好", "不大"], emoji: "🚫", groupId: "g2" },
  { char: "日", pinyin: "rì", words: ["日月", "日子"], emoji: "☀️", groupId: "g2" },
  { char: "月", pinyin: "yuè", words: ["月亮", "日月"], emoji: "🌙", groupId: "g2" },
  { char: "水", pinyin: "shuǐ", words: ["水果", "口水"], emoji: "💧", groupId: "g2" },
  { char: "火", pinyin: "huǒ", words: ["火车", "大火"], emoji: "🔥", groupId: "g2" },
];

const g3: CharItem[] = [
  { char: "山", pinyin: "shān", words: ["山上", "大山"], emoji: "⛰️", groupId: "g3" },
  { char: "石", pinyin: "shí", words: ["石头", "山石"], emoji: "🪨", groupId: "g3" },
  { char: "田", pinyin: "tián", words: ["田地", "水田"], emoji: "🌾", groupId: "g3" },
  { char: "土", pinyin: "tǔ", words: ["土地", "泥土"], emoji: "🟤", groupId: "g3" },
  { char: "木", pinyin: "mù", words: ["木头", "树木"], emoji: "🌳", groupId: "g3" },
  { char: "禾", pinyin: "hé", words: ["禾苗", "禾田"], emoji: "🌿", groupId: "g3" },
  { char: "米", pinyin: "mǐ", words: ["大米", "米饭"], emoji: "🍚", groupId: "g3" },
  { char: "白", pinyin: "bái", words: ["白天", "白云"], emoji: "⬜", groupId: "g3" },
  { char: "云", pinyin: "yún", words: ["白云", "云朵"], emoji: "☁️", groupId: "g3" },
  { char: "天", pinyin: "tiān", words: ["天上", "白天"], emoji: "🌤️", groupId: "g3" },
];

const g4: CharItem[] = [
  { char: "上", pinyin: "shàng", words: ["上下", "上山"], emoji: "⬆️", groupId: "g4" },
  { char: "下", pinyin: "xià", words: ["上下", "下山"], emoji: "⬇️", groupId: "g4" },
  { char: "左", pinyin: "zuǒ", words: ["左右", "左手"], emoji: "⬅️", groupId: "g4" },
  { char: "右", pinyin: "yòu", words: ["左右", "右手"], emoji: "➡️", groupId: "g4" },
  { char: "前", pinyin: "qián", words: ["前后", "前面"], emoji: "🔜", groupId: "g4" },
  { char: "后", pinyin: "hòu", words: ["前后", "后面"], emoji: "🔙", groupId: "g4" },
  { char: "里", pinyin: "lǐ", words: ["里面", "里外"], emoji: "📦", groupId: "g4" },
  { char: "外", pinyin: "wài", words: ["外面", "里外"], emoji: "🏞️", groupId: "g4" },
  { char: "多", pinyin: "duō", words: ["多少", "很多"], emoji: "➕", groupId: "g4" },
  { char: "少", pinyin: "shǎo", words: ["多少", "少年"], emoji: "➖", groupId: "g4" },
];

const g5: CharItem[] = [
  { char: "开", pinyin: "kāi", words: ["开门", "开心"], emoji: "🔓", groupId: "g5" },
  { char: "关", pinyin: "guān", words: ["关门", "开关"], emoji: "🔒", groupId: "g5" },
  { char: "来", pinyin: "lái", words: ["来去", "过来"], emoji: "🏃", groupId: "g5" },
  { char: "去", pinyin: "qù", words: ["来去", "出去"], emoji: "🚶", groupId: "g5" },
  { char: "出", pinyin: "chū", words: ["出来", "出去"], emoji: "📤", groupId: "g5" },
  { char: "见", pinyin: "jiàn", words: ["看见", "再见"], emoji: "👀", groupId: "g5" },
  { char: "目", pinyin: "mù", words: ["目光", "耳目"], emoji: "👁️", groupId: "g5" },
  { char: "耳", pinyin: "ěr", words: ["耳朵", "耳目"], emoji: "👂", groupId: "g5" },
];

export const charGroups: CharGroup[] = [
  { id: "g1", name: "数字基础", chars: g1 },
  { id: "g2", name: "常用字", chars: g2 },
  { id: "g3", name: "自然万物", chars: g3 },
  { id: "g4", name: "方位数量", chars: g4 },
  { id: "g5", name: "动作感官", chars: g5 },
];

export const allChars: CharItem[] = charGroups.flatMap((g) => g.chars);
