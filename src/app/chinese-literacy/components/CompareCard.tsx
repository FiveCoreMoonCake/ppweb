"use client";

import React from "react";
import { Volume2 } from "lucide-react";
import { allChars, type CharItem } from "@/data/characters";
import type { ConfusablePair } from "../lib/confusables";
import { speakChar } from "../lib/voice";
import { PinyinText } from "./CharCard";

function MiniCard({ item, hint, accent }: { item: CharItem; hint: string; accent: "indigo" | "rose" }) {
  const colors = accent === "indigo"
    ? { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", badge: "bg-indigo-500" }
    : { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", badge: "bg-rose-500" };

  return (
    <div className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 ${colors.border} ${colors.bg}`}>
      {/* Emoji */}
      <span className="text-3xl">{item.readings[0]?.emoji}</span>

      {/* Character */}
      <p className={`text-5xl font-bold ${colors.text}`}>{item.char}</p>

      {/* Pinyin — 声母红 / 韵母蓝 */}
      <p className="text-lg font-bold tracking-wide flex flex-wrap justify-center gap-x-2">
        {item.readings.map((r, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-slate-300">/</span>}
            <PinyinText pinyin={r.pinyin} />
          </React.Fragment>
        ))}
      </p>

      {/* Words */}
      <div className="flex gap-2 text-sm font-medium text-slate-600">
        {item.readings[0]?.words.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      {/* Mnemonic hint */}
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-center leading-relaxed">
        {hint}
      </p>

      {/* Speak button */}
      <button
        onClick={(e) => { e.stopPropagation(); speakChar(item); }}
        className={`flex items-center gap-1.5 ${colors.badge} text-white rounded-full px-3 py-1.5 text-xs hover:opacity-90 active:scale-95 transition-all`}
      >
        <Volume2 className="w-3.5 h-3.5" /> 朗读
      </button>
    </div>
  );
}

const typeLabels: Record<ConfusablePair["type"], string> = {
  shape: "形近字",
  pair: "配对字",
  radical: "偏旁字",
};

const typeEmojis: Record<ConfusablePair["type"], string> = {
  shape: "🔍",
  pair: "🔗",
  radical: "📐",
};

export function CompareCard({ pair }: { pair: ConfusablePair }) {
  const [charA, charB] = pair.chars;
  const itemA = allChars.find((c) => c.char === charA);
  const itemB = allChars.find((c) => c.char === charB);

  if (!itemA || !itemB) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Type badge */}
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
        {typeEmojis[pair.type]} {typeLabels[pair.type]}对比
      </span>

      {/* Side by side cards */}
      <div className="flex gap-3 w-full">
        <MiniCard item={itemA} hint={pair.hints[0]} accent="indigo" />
        <MiniCard item={itemB} hint={pair.hints[1]} accent="rose" />
      </div>

      {/* Joint words */}
      <p className="text-sm text-slate-500">
        <span className="font-bold text-indigo-600">{charA}</span>
        {" + "}
        <span className="font-bold text-rose-600">{charB}</span>
        {" → "}
        <span className="font-bold text-slate-700">
          {findJointWords(itemA, itemB)}
        </span>
      </p>
    </div>
  );
}

/** Find words that contain both characters */
function findJointWords(a: CharItem, b: CharItem): string {
  const allWords = new Set<string>();
  for (const r of a.readings) {
    for (const w of r.words) {
      if (w.includes(b.char)) allWords.add(w);
    }
  }
  for (const r of b.readings) {
    for (const w of r.words) {
      if (w.includes(a.char)) allWords.add(w);
    }
  }
  return allWords.size > 0 ? [...allWords].join("、") : `${a.char}${b.char}`;
}
