"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";

export function QuizSettings({
  onStart,
  onBack,
  learnedCount,
}: {
  onStart: (count: number) => void;
  onBack: () => void;
  learnedCount: number;
}) {
  const [count, setCount] = useState(10);

  const counts = [5, 10, 15, 20, 30, 50];
  const effectiveCount = Math.min(count, learnedCount);

  return (
    <div className="flex flex-col h-dvh">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">测验设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 max-w-xl mx-auto w-full">
        <p className="text-sm text-slate-500 mb-6">
          从已学的 {learnedCount} 个字中智能出题，优先测试新字和易错字。
        </p>

        <h2 className="font-bold text-slate-700 mb-3">题目数量</h2>
        <div className="flex flex-wrap gap-2 mb-8">
          {counts.map((n) => (
            <button
              key={n}
              disabled={n > learnedCount}
              onClick={() => setCount(n)}
              className={`px-5 py-2.5 rounded-xl border-2 text-sm font-bold transition-all disabled:opacity-30 ${
                count === n
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              {n} 题
            </button>
          ))}
        </div>

        <button
          disabled={learnedCount < 4}
          onClick={() => onStart(effectiveCount)}
          className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-lg hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          开始测验 🚀
        </button>
        {learnedCount < 4 && (
          <p className="text-xs text-rose-500 mt-2 text-center">需先学习至少 4 个字才能开始测验</p>
        )}
      </div>
    </div>
  );
}
