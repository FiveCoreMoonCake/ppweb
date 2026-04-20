"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { allChars } from "@/data/characters";

export function ListenQuizSettings({
  onStart,
  onBack,
  learnedChars,
}: {
  onStart: () => void;
  onBack: () => void;
  learnedChars: Set<string>;
}) {
  const availableCount = allChars.filter(
    (c) => learnedChars.has(c.char) && c.readings.length === 1
  ).length;

  return (
    <div className="flex flex-col h-dvh">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">九格顺选设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 max-w-xl mx-auto w-full">
        <p className="text-sm text-slate-500 mb-6">
          从已学的字中智能出 9 个字，排成 3×3 方阵，听音顺序选出。
          {availableCount > 0 && <span className="text-slate-400"> （可用 {availableCount} 个单音字）</span>}
        </p>

        <button
          disabled={availableCount < 9}
          onClick={onStart}
          className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-lg hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          开始游戏 🎮
        </button>
        {availableCount < 9 && (
          <p className="text-xs text-rose-500 mt-2 text-center">
            需先学习至少 9 个单音字才能开始游戏（当前 {availableCount} 个）
          </p>
        )}
      </div>
    </div>
  );
}
