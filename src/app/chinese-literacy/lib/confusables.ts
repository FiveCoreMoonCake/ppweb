/**
 * Confusable character pairs — characters that children often mix up.
 *
 * Three categories:
 *   - "shape":  visually similar (形近字)
 *   - "pair":   always appear together in words, hard to distinguish individually (配对字)
 *   - "radical": same radical / component, easy to confuse (偏旁字)
 *
 * Each pair has a short mnemonic hint for each character to help differentiate.
 */

export interface ConfusablePair {
  chars: [string, string];
  type: "shape" | "pair" | "radical";
  hints: [string, string]; // mnemonic hint for each char
}

export const confusablePairs: ConfusablePair[] = [
  // ── Shape-similar (形近字) ──
  { chars: ["日", "目"], type: "shape", hints: ["日 窄窄的，太阳小小的", "目 宽宽的，眼睛大大的"] },
  { chars: ["人", "入"], type: "shape", hints: ["人 撇长捺短，人站着", "入 撇短捺长，走进去"] },
  { chars: ["大", "太"], type: "shape", hints: ["大 两腿叉开，好大", "太 大下加一点，太大了！"] },
  { chars: ["王", "玉"], type: "shape", hints: ["王 三横一竖，国王的王", "玉 王加一点，宝玉亮晶晶"] },
  { chars: ["王", "主"], type: "shape", hints: ["王 三横一竖，国王", "主 王上加一点，主人在上面"] },
  { chars: ["干", "千"], type: "shape", hints: ["干 一横是平的，干干净净", "千 撇下来，一千个"] },
  { chars: ["土", "士"], type: "shape", hints: ["土 下横长，土地宽", "士 上横长，战士站直"] },
  { chars: ["买", "卖"], type: "shape", hints: ["买 没有十，花钱买东西", "卖 上面有十，卖掉赚钱"] },
  { chars: ["白", "百"], type: "shape", hints: ["白 白色，干干净净", "百 白上加一横，一百个"] },
  { chars: ["木", "本"], type: "shape", hints: ["木 一棵树", "本 树下加一横，树根是本"] },
  { chars: ["目", "自"], type: "shape", hints: ["目 眼睛，四四方方", "自 目上加一撇，自己的自"] },

  // ── Always-paired (配对字) ──
  { chars: ["喜", "欢"], type: "pair", hints: ["喜 上面是士口，嘴巴笑嘻嘻", "欢 左边又右边欠，高兴得张嘴"] },
  { chars: ["朋", "友"], type: "pair", hints: ["朋 两个月并排，朋友成双", "友 手拉手，交朋友"] },
  { chars: ["爸", "妈"], type: "pair", hints: ["爸 上面父，爸爸是父亲", "妈 左边女，妈妈是女的"] },
  { chars: ["东", "西"], type: "pair", hints: ["东 太阳从东边升起", "西 太阳往西边落下"] },
  { chars: ["开", "关"], type: "pair", hints: ["开 两手拉开门", "关 把门关上，里面有大"] },
  { chars: ["来", "去"], type: "pair", hints: ["来 过来，向我这边", "去 出去，离我远了"] },
  { chars: ["左", "右"], type: "pair", hints: ["左 左手那边，有个工", "右 右手那边，有个口"] },
  { chars: ["前", "后"], type: "pair", hints: ["前 往前走，前面有路", "后 转过身，后面跟着"] },
  { chars: ["多", "少"], type: "pair", hints: ["多 两个夕，多了一个", "少 小上加一撇，少了一点"] },
  { chars: ["快", "慢"], type: "pair", hints: ["快 心里高兴，跑得快", "慢 心里拖着，慢慢走"] },
  { chars: ["高", "低"], type: "pair", hints: ["高 字本身就高高的", "低 人低下了头"] },
  { chars: ["远", "近"], type: "pair", hints: ["远 走得远，元在那边", "近 走得近，斤在旁边"] },
  { chars: ["哥", "姐"], type: "pair", hints: ["哥 两个口叠着，哥哥嘴多", "姐 女在左边，姐姐是女的"] },
  { chars: ["弟", "妹"], type: "pair", hints: ["弟 弓下面，弟弟爱弹弓", "妹 女在左边，妹妹是女的"] },
  { chars: ["上", "下"], type: "pair", hints: ["上 竖在横上面，往上", "下 竖在横下面，往下"] },
  { chars: ["冷", "热"], type: "pair", hints: ["冷 两点水，冰冰凉", "热 四点底，火在烧"] },
  { chars: ["黑", "白"], type: "pair", hints: ["黑 下面四点像灰烬", "白 干干净净，什么都没有"] },
  { chars: ["新", "旧"], type: "pair", hints: ["新 亲手砍柴做新的", "旧 过了一天就旧了"] },
  { chars: ["真", "假"], type: "pair", hints: ["真 里面有目，看清楚是真的", "假 人在旁边装的，是假的"] },
  { chars: ["苦", "甜"], type: "pair", hints: ["苦 草字头下有古，老味道好苦", "甜 舌头尝到了，好甜"] },
  { chars: ["胖", "瘦"], type: "pair", hints: ["胖 月+半，胖了半个月亮", "瘦 病字头里叟，老人瘦了"] },

  // ── Same-radical (偏旁字) ──
  { chars: ["请", "情"], type: "radical", hints: ["请 言字旁，用嘴巴说请", "情 竖心旁，心里的感情"] },
  { chars: ["晴", "清"], type: "radical", hints: ["晴 日字旁，有太阳就晴天", "清 三点水，水清清的"] },
  { chars: ["跑", "跳"], type: "radical", hints: ["跑 足+包，包住脚快跑", "跳 足+兆，脚用力一跳"] },
  { chars: ["吃", "喝"], type: "radical", hints: ["吃 口+乞，嘴巴吃东西", "喝 口+曷，张嘴喝水"] },
  { chars: ["河", "湖"], type: "radical", hints: ["河 水+可，可以流的水是河", "湖 水+胡，大大的胡是湖"] },
  { chars: ["猫", "狗"], type: "radical", hints: ["猫 犬旁+苗，苗苗叫的是猫", "狗 犬旁+句，句句叫的是狗"] },
  { chars: ["蝴", "蝶"], type: "radical", hints: ["蝴 虫+胡，蝴蝶的蝴", "蝶 虫+世+木，蝴蝶的蝶"] },
  { chars: ["鸡", "鸭"], type: "radical", hints: ["鸡 又+鸟，鸡是一种鸟", "鸭 甲+鸟，壳硬甲的鸟是鸭"] },
];

/** Build a lookup map: char → all confusable pairs it belongs to */
const _pairMap = new Map<string, ConfusablePair[]>();
for (const pair of confusablePairs) {
  for (const ch of pair.chars) {
    if (!_pairMap.has(ch)) _pairMap.set(ch, []);
    _pairMap.get(ch)!.push(pair);
  }
}

/** Get all confusable pairs for a given character */
export function getConfusablePairs(char: string): ConfusablePair[] {
  return _pairMap.get(char) ?? [];
}

/** Get all confusable partner characters for a given character */
export function getConfusableChars(char: string): string[] {
  const pairs = getConfusablePairs(char);
  return pairs.map((p) => (p.chars[0] === char ? p.chars[1] : p.chars[0]));
}
