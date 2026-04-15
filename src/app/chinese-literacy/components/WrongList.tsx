"use client";

import React from "react";
import { motion } from "framer-motion";
import { Volume2, ArrowLeft } from "lucide-react";
import { allChars, type CharItem } from "@/data/characters";
import type { CharRecord } from "../lib/types";
import { speakChar } from "../lib/voice";
import { getWrongChars } from "../lib/quiz-engine";

export function WrongList({
  records,
  onBack,
  onStartPractice,
}: {
  records: Record<string, CharRecord>;
  onBack: () => void;
  onStartPractice: (chars: CharItem[]) => void;
}) {
  const wrongChars = getWrongChars(records);

  const handlePlaySound = (char: string) => {
    const item = allChars.find((c) => c.char === char);
    if (item) speakChar(item);
  };

  const handleStartPractice = () => {
    const wrongCharItems = wrongChars
      .map((wc) => allChars.find((c) => c.char === wc.char))
      .filter((item): item is CharItem => item !== undefined);
    if (wrongCharItems.length >= 4) {
      onStartPractice(wrongCharItems);
    }
  };

  return (
    <div className="flex flex-col h-dvh">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">易错字表</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 max-w-xl mx-auto w-full">
        <p className="text-sm text-slate-500 mb-6">
          正确率低于 50% 且答题次数 ≥ 3 的字
        </p>

        {wrongChars.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <span className="text-6xl">🎉</span>
            <p className="text-lg font-bold text-slate-700">暂无易错字，继续加油！</p>
            <p className="text-sm text-slate-400">所有字的正确率都在 50% 以上，或答题次数不足 3 次</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-3"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {wrongChars.map((wc) => {
                const item = allChars.find((c) => c.char === wc.char);
                const accuracyPct = Math.round(wc.accuracy * 100);
                const total = wc.right + wc.wrong;
                const colorClass =
                  accuracyPct < 30
                    ? "border-rose-300 bg-rose-50"
                    : "border-orange-300 bg-orange-50";
                const textColor =
                  accuracyPct < 30 ? "text-rose-600" : "text-orange-600";
                const barColor =
                  accuracyPct < 30 ? "bg-rose-400" : "bg-orange-400";

                return (
                  <motion.div
                    key={wc.char}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`rounded-xl border-2 ${colorClass} shadow-sm p-4 flex flex-col items-center gap-2`}
                  >
                    <span className="text-4xl font-bold text-slate-800">
                      {wc.char}
                    </span>

                    {item && (
                      <div className="flex flex-wrap justify-center gap-1 text-xs text-slate-500 font-mono">
                        {item.readings.map((r, i) => (
                          <span key={i}>{r.pinyin}</span>
                        ))}
                      </div>
                    )}

                    <div className="w-full">
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all`}
                          style={{ width: `${accuracyPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className={`font-bold ${textColor}`}>
                        {accuracyPct}%
                      </span>
                      <span className="text-slate-400">
                        {wc.wrong}错 / {total}次
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySound(wc.char);
                      }}
                      className="mt-1 p-2 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
                      title="播放读音"
                    >
                      <Volume2 className="w-4 h-4 text-indigo-500" />
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {wrongChars.length >= 4 && (
              <button
                onClick={handleStartPractice}
                className="mt-6 w-full py-4 rounded-2xl bg-rose-500 text-white font-bold text-lg hover:bg-rose-600 active:scale-[0.98] transition-all"
              >
                开始专项练习 🎯
              </button>
            )}
            {wrongChars.length > 0 && wrongChars.length < 4 && (
              <p className="mt-4 text-xs text-slate-400 text-center">
                易错字不足 4 个，无法生成专项练习（需至少 4 个字出题）
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
