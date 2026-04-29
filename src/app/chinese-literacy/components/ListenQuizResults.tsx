"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Check, X as XIcon } from "lucide-react";
import { allChars, type CharItem } from "@/data/characters";
import type { ListenQuizResult } from "../lib/types";
import { speakChar } from "../lib/voice";
import { playVictoryMusic } from "../lib/sound-effects";
import { CharCard, PinyinText } from "./CharCard";

export function ListenQuizResults({
  result,
  grid,
  onRetry,
  onBack,
  backLabel = "返回",
}: {
  result: ListenQuizResult;
  grid: CharItem[];
  onRetry?: () => void;
  onBack: () => void;
  backLabel?: string;
}) {
  const perfect = result.totalMistakes === 0;
  const [showCard, setShowCard] = useState<CharItem | null>(null);

  useEffect(() => {
    if (perfect) {
      const timer = setTimeout(playVictoryMusic, 500);
      return () => clearTimeout(timer);
    }
  }, [perfect]);

  const mistakeChars = new Map<string, { item: CharItem; asTarget: boolean; asWrongTap: boolean }>();
  for (const m of result.mistakes) {
    const key = m.target.char;
    const existing = mistakeChars.get(key);
    if (existing) {
      existing.asTarget = true;
    } else {
      mistakeChars.set(key, { item: m.target, asTarget: true, asWrongTap: false });
    }
    for (const wrongChar of m.wrongTaps) {
      const wrongItem = grid.find((c) => c.char === wrongChar) || allChars.find((c) => c.char === wrongChar);
      if (!wrongItem) continue;
      const ex = mistakeChars.get(wrongChar);
      if (ex) {
        ex.asWrongTap = true;
      } else {
        mistakeChars.set(wrongChar, { item: wrongItem, asTarget: false, asWrongTap: true });
      }
    }
  }

  return (
    <div className="flex flex-col h-dvh">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">九格顺选结果</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 max-w-lg mx-auto w-full">
        <div className="text-center mb-8">
          <p className="text-6xl font-bold mb-2">{perfect ? "🎉" : "💪"}</p>
          <p className="text-2xl font-bold text-slate-800">
            {perfect ? "全部正确！太棒了！" : `完成了！错了 ${result.totalMistakes} 次`}
          </p>
          <p className="text-slate-500 mt-1">
            {perfect ? "一次都没选错，真厉害！" : "下面是需要复习的字"}
          </p>
        </div>

        {!perfect && (
          <div className="mb-8 space-y-3">
            <h2 className="font-bold text-slate-700">需要复习的字</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[...mistakeChars.values()].map(({ item, asTarget, asWrongTap }) => {
                const r = item.readings[0];
                return (
                  <button
                    key={item.char}
                    onClick={() => speakChar(item)}
                    className={`rounded-xl border-2 p-3 flex flex-col items-center gap-1 transition-all hover:shadow-md active:scale-95 ${
                      asTarget && asWrongTap
                        ? "border-orange-300 bg-orange-50"
                        : asTarget
                        ? "border-rose-300 bg-rose-50"
                        : "border-amber-300 bg-amber-50"
                    }`}
                  >
                    <span className="text-2xl font-bold">{item.char}</span>
                    {r && (
                      <>
                        <span className="text-xs text-slate-500 font-mono">{r.pinyin}</span>
                        <span className="text-xs text-slate-600">{r.words.join("、")}</span>
                      </>
                    )}
                    <span className="text-[10px] mt-0.5 text-slate-400">
                      {asTarget && asWrongTap ? "没选对 & 被误选" : asTarget ? "没选对" : "被误选"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <AnimatePresence>
          {showCard && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
              onClick={() => setShowCard(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-sm w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <CharCard item={showCard} />
                <button
                  onClick={() => setShowCard(null)}
                  className="mt-5 w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-colors"
                >
                  关闭
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-8">
          <h3 className="font-bold text-slate-700 mb-2">测验总结</h3>
          <p className="text-xs text-slate-400 mb-3">点击字可听读音</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {grid.map((item) => {
              const hasMistake = result.mistakes.some((m) => m.target.char === item.char || m.wrongTaps.includes(item.char));
              const r = item.readings[0];
              return (
                <button
                  key={item.char}
                  onClick={() => speakChar(item)}
                  className={`relative px-2 py-2 rounded-xl border-2 flex flex-col items-center gap-0.5 transition-all hover:shadow-sm active:scale-95 ${
                    hasMistake
                      ? "border-rose-200 bg-rose-50"
                      : "border-emerald-200 bg-emerald-50"
                  }`}
                  title={r ? `${r.pinyin} ${r.words.join("、")}` : ""}
                >
                  <span className={`absolute top-0.5 right-0.5 ${hasMistake ? "text-rose-500" : "text-emerald-500"}`}>
                    {hasMistake ? <XIcon className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                  </span>
                  {r && <PinyinText pinyin={r.pinyin} className="text-[11px] font-bold leading-none" />}
                  <span className={`text-2xl font-bold leading-tight ${hasMistake ? "text-rose-700" : "text-emerald-700"}`}>{item.char}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 py-3.5 rounded-xl bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 active:scale-[0.98] transition-all"
            >
              <RotateCcw className="w-5 h-5" /> 再来一次
            </button>
          )}
          <button
            onClick={onBack}
            className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 active:scale-[0.98] transition-all"
          >
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
