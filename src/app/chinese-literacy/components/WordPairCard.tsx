"use client";

import React from "react";
import { Volume2 } from "lucide-react";
import { allChars, type CharItem } from "@/data/characters";
import type { WordPair } from "../lib/word-pairs";
import { speakWord, speakCharInWord } from "../lib/voice";
import { PinyinText } from "./CharCard";

function PairCharCard({
  item,
  pair,
  charIdx,
  accent,
}: {
  item: CharItem;
  pair: WordPair;
  charIdx: 0 | 1;
  accent: "indigo" | "rose";
}) {
  const ctx = pair.charContexts[charIdx];
  const colors =
    accent === "indigo"
      ? { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" }
      : { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" };

  const handleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    speakCharInWord(item.char, pair.word, ctx.phrases, ctx.meaning);
  };

  return (
    <button
      onClick={handleTap}
      className={`flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 ${colors.border} ${colors.bg} hover:shadow-md active:scale-[0.97] transition-all cursor-pointer`}
    >
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

      {/* Meaning hint */}
      <p className="text-xs text-slate-400 leading-relaxed text-center">
        {ctx.meaning}
      </p>

      {/* "点击听详细" indicator */}
      <span className="text-[10px] text-slate-300 flex items-center gap-1">
        <Volume2 className="w-3 h-3" /> 点击听详细
      </span>
    </button>
  );
}

export function WordPairCard({ pair }: { pair: WordPair }) {
  const [charA, charB] = pair.chars;
  const itemA = allChars.find((c) => c.char === charA);
  const itemB = allChars.find((c) => c.char === charB);

  if (!itemA || !itemB) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Word label + speak button */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{pair.emoji}</span>
        <span className="text-3xl font-bold text-slate-800">{pair.word}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            speakWord(pair.word);
          }}
          className="flex items-center gap-1.5 bg-emerald-500 text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-emerald-600 active:scale-95 transition-all"
        >
          <Volume2 className="w-4 h-4" /> 朗读
        </button>
      </div>

      {/* Optional word-level explanation */}
      {pair.explain && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center max-w-[320px] leading-relaxed">
          {pair.explain}
        </p>
      )}

      {/* Side by side char cards */}
      <div className="flex gap-3 w-full">
        <PairCharCard item={itemA} pair={pair} charIdx={0} accent="indigo" />
        <PairCharCard item={itemB} pair={pair} charIdx={1} accent="rose" />
      </div>

      {/* Instruction */}
      <p className="text-xs text-slate-400">👆 点击字卡听详细读音和解释</p>
    </div>
  );
}
