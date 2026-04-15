"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Check, X as XIcon } from "lucide-react";
import type { CharItem } from "@/data/characters";
import type { QuizAnswer } from "../lib/types";
import { speakChar, speakReading } from "../lib/voice";
import { playVictoryMusic } from "../lib/sound-effects";
import { CharCard } from "./CharCard";

export function QuizResults({
  answers,
  onRetry,
  onBack,
}: {
  answers: QuizAnswer[];
  onRetry: () => void;
  onBack: () => void;
}) {
  const correct = answers.filter((a) => a.isCorrect).length;
  const total = answers.length;
  const pct = Math.round((correct / total) * 100);
  const wrong = answers.filter((a) => !a.isCorrect);

  const [showCard, setShowCard] = useState<CharItem | null>(null);

  useEffect(() => {
    if (pct === 100) {
      const timer = setTimeout(playVictoryMusic, 500);
      return () => clearTimeout(timer);
    }
  }, [pct]);

  return (
    <div className="flex flex-col h-dvh">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">测验结果</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 max-w-lg mx-auto w-full">
        <div className="text-center mb-8">
          <p className="text-6xl font-bold mb-2">
            {pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📚"}
          </p>
          <p className="text-4xl font-bold text-slate-800">{pct}%</p>
          <p className="text-slate-500 mt-1">答对 {correct} / {total} 题</p>
        </div>

        {wrong.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-slate-700 mb-3">需要复习的字</h3>
            <div className="flex flex-wrap gap-2">
              {wrong.map((a) => (
                <button
                  key={a.question.correct.char}
                  onClick={() => setShowCard(a.question.correct)}
                  className="px-4 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xl font-bold hover:bg-rose-100 transition-colors"
                >
                  {a.question.correct.char}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {showCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
              onClick={() => setShowCard(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
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
          <div className="flex flex-wrap gap-1.5">
            {answers.map((a) => {
              const r = a.question.correct.readings[a.question.readingIdx];
              return (
                <button
                  key={a.question.correct.char + a.question.readingIdx}
                  onClick={() => { speakChar(a.question.correct); setShowCard(a.question.correct); }}
                  className={`px-2.5 py-1.5 rounded-lg border text-base font-bold transition-all hover:shadow-sm active:scale-95 ${
                    a.isCorrect
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                  title={`${r.pinyin} ${r.words.join("、")}`}
                >
                  {a.question.correct.char}
                  {a.isCorrect ? <Check className="w-3 h-3 inline ml-0.5 -mt-0.5" /> : <XIcon className="w-3 h-3 inline ml-0.5 -mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 py-3.5 rounded-xl bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 active:scale-[0.98] transition-all"
          >
            <RotateCcw className="w-5 h-5" /> 再来一次
          </button>
          <button
            onClick={onBack}
            className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 active:scale-[0.98] transition-all"
          >
            返回
          </button>
        </div>
      </div>
    </div>
  );
}
