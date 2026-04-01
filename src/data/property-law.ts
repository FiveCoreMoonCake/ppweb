export interface FutureInterest {
  name: string;
  holder: string;
  mechanism: string;
}

export interface PropertyLawItem {
  id: string;
  name: string;
  magicWords: string[];
  futureInterest: FutureInterest;
  caseStudy: string;
  tricks: string;
}

export const propertyLawData: PropertyLawItem[] = [
  {
    id: "fsa",
    name: "Fee Simple Absolute (FSA，绝对无条件所有权)",
    magicWords: ["\"To A\"", "\"To A and his heirs\""],
    futureInterest: {
      name: "无 (None)",
      holder: "无",
      mechanism: "无"
    },
    caseStudy: "O (Original Owner / 原所有人) 转让给 A (Grantee / 受让人)。",
    tricks: "这是最完整的权利，没有任何限制，永远属于 A。不要被 \"his heirs\" (他的继承人) 骗了，A 的继承人目前没有任何权利。"
  },
  {
    id: "fsd",
    name: "Fee Simple Determinable (FSD，可定止所有权)",
    magicWords: ["So long as (只要)", "While (在...期间)", "During (在...期间)", "Until (直到)"],
    futureInterest: {
      name: "Possibility of Reverter (POR，收回之可能性)",
      holder: "O (Original Owner / 原所有人)",
      mechanism: "自动收回"
    },
    caseStudy: "O 给 A，so long as 土地用作农场。",
    tricks: "A 只要建了工厂，土地瞬间、自动回到 O 手里，不需要 O 采取任何法律行动。"
  },
  {
    id: "fsscs",
    name: "Fee Simple Subject to Condition Subsequent (FSSCS，附条件后续所有权)",
    magicWords: ["But if (但是如果)", "Upon condition that (在...条件下)", "Provided that (假如)"],
    futureInterest: {
      name: "Right of Entry (ROE，进入权/终止权)",
      holder: "O (Original Owner / 原所有人)",
      mechanism: "必须主动行权"
    },
    caseStudy: "O 给 A，but if A 卖酒，O 有权重新进入。",
    tricks: "A 卖酒了，地不会自动还给 O。O 必须主动去法院起诉或实际进入土地。在 O 行动前，地依然是 A 的。"
  },
  {
    id: "fssel",
    name: "Fee Simple Subject to Executory Limitation (FSSEL，附执行限制所有权) + Shifting Executory Interest (转移型执行权益)",
    magicWords: ["(上述任何条件词) + 转给第三方 B"],
    futureInterest: {
      name: "Shifting Executory Interest (转移型执行权益)",
      holder: "B (Third Party / 第三方)",
      mechanism: "粗鲁打断 A"
    },
    caseStudy: "O 给 A，but if A 卖酒，then to B。",
    tricks: "A 一旦卖酒，B 会直接剥夺 A 的权利上位。只要看到条件触发后给了“第三方 (Third Party)”，必定是 Executory Interest (执行性权益)。"
  },
  {
    id: "le-rev",
    name: "Life Estate (LE，终身地产权) + Reversion (归复权)",
    magicWords: ["\"To A for life\" (给 A 终其一生)"],
    futureInterest: {
      name: "Reversion (归复权)",
      holder: "O (Original Owner / 原所有人)",
      mechanism: "A 死后自然回归"
    },
    caseStudy: "O 给 A for life。",
    tricks: "A 死后，土地自然回到 O (或 O 的继承人) 手里。考点常涉及 A 在世时不能破坏土地价值 (Waste / 损耗)。"
  },
  {
    id: "le-vr",
    name: "Life Estate (LE，终身地产权) + Vested Remainder (既得剩余权)",
    magicWords: ["\"To A for life, then to B\""],
    futureInterest: {
      name: "Vested Remainder (既得剩余权)",
      holder: "B (Third Party / 第三方)",
      mechanism: "礼貌等待，无悬念接班"
    },
    caseStudy: "O 给 A for life，然后给 B。",
    tricks: "B 是明确的人且没有先决条件。即使 B 比 A 先死，B 的权利也会传给 B 的继承人，A 死后由 B 的继承人接手。"
  },
  {
    id: "le-cr",
    name: "Life Estate (LE，终身地产权) + Contingent Remainder (或有剩余权)",
    magicWords: ["\"To A for life, then to B if...\""],
    futureInterest: {
      name: "Contingent Remainder (或有剩余权)",
      holder: "B (Third Party / 第三方)",
      mechanism: "附加: O 拥有兜底的 Reversion (归复权)"
    },
    caseStudy: "O 给 A for life，然后给 B，如果 B 活到 21 岁。",
    tricks: "如果 A 死的时候 B 才 18 岁怎么办？土地先回到 O 手里 (Reversion / 归复权)，等 B 到了 21 岁，B 再作为 Springing Executory Interest (弹跳型执行权益) 把地从 O 手里抢走。"
  },
  {
    id: "springing",
    name: "(无特定当前产权) + Springing Executory Interest (弹跳型执行权益)",
    magicWords: ["\"To A, if / when...\""],
    futureInterest: {
      name: "Springing Executory Interest (弹跳型执行权益)",
      holder: "A (Grantee / 受让人)",
      mechanism: "粗鲁打断 O"
    },
    caseStudy: "O 给 A，如果 A 结婚。",
    tricks: "转让时 A 还没结婚，所以地还在 O (Original Owner / 原所有人) 手里。A 一结婚，直接把权利从 O 手里抢走。剥夺原主的，就是 Springing (弹跳型)。"
  }
];
