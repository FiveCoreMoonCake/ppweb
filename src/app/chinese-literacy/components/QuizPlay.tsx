"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, ArrowLeft, Check, X as XIcon } from "lucide-react";
import type { CharRecord, QuizQuestion, QuizAnswer } from "../lib/types";
import { stopAll, playPrerecorded, speak, speakReading } from "../lib/voice";
import { playCorrectSound, playWrongSound } from "../lib/sound-effects";
import { recordAnswerLocal } from "../lib/spaced-repetition";

export function QuizPlay({
  questions,
  onFinish,
  onBack,
  records,
  userId,
  onRecordsChange,
}: {
  questions: QuizQuestion[];
  onFinish: (answers: QuizAnswer[]) => void;
  onBack: () => void;
  records: Record<string, CharRecord>;
  userId: string;
  onRecordsChange: (r: Record<string, CharRecord>) => void;
}) {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const hasSpoken = useRef(false);

  const q = questions[qIdx];
  const reading = q.correct.readings[q.readingIdx];
  const isPolyphonic = q.correct.readings.length > 1;
  const isCorrect = selected === q.correct.char;
  const answered = selected !== null;

  const speakPrompt = useCallback(() => {
    stopAll();
    if (isPolyphonic) {
      speakReading(q.correct.char, reading);
    } else {
      const pre = playPrerecorded(q.correct.char);
      if (!pre) speak(q.correct.char);
    }
  }, [q.correct.char, reading, isPolyphonic]);

  useEffect(() => {
    hasSpoken.current = false;
    const timer = setTimeout(() => {
      if (!hasSpoken.current) {
        speakPrompt();
        hasSpoken.current = true;
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [qIdx, speakPrompt]);

  const handleSelect = (char: string) => {
    if (answered) return;
    setSelected(char);
    const correct = char === q.correct.char;
    const answer: QuizAnswer = { question: q, selected: char, isCorrect: correct };
    setAnswers((prev) => [...prev, answer]);

    onRecordsChange(recordAnswerLocal(records, q.correct.char, correct, userId));

    if (correct) {
      playCorrectSound();
      const r = q.correct.readings[q.readingIdx];
      setTimeout(() => {
        if (q.correct.readings.length > 1) speakReading(q.correct.char, r);
        else speakReading(q.correct.char, r, q.correct.char);
      }, 300);
    } else {
      playWrongSound();
    }
  };

  const handleNext = () => {
    stopAll();
    if (qIdx < questions.length - 1) {
      setSelected(null);
      setQIdx((i) => i + 1);
    } else {
      onFinish(answers);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (answered && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        handleNext();
      }
      if (!answered && e.key >= "1" && e.key <= "4") {
        const idx = parseInt(e.key) - 1;
        if (idx < q.options.length) handleSelect(q.options[idx].char);
      }
      if (e.key === "r" || e.key === "R") {
        speakPrompt();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <div className="flex flex-col h-dvh">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-slate-500 tabular-nums">
          {qIdx + 1} / {questions.length}
        </span>
        <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${((qIdx + (answered ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-4 overflow-y-auto">
          <p className="text-slate-500 font-medium text-sm">听一听，选一选 👂</p>
          <p className="text-[11px] text-slate-400 -mt-2">{isPolyphonic ? "听词语，找出对应的字" : "听发音，找出对应的字"}</p>

          <button
            onClick={() => speakPrompt()}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 active:scale-95 transition-all shrink-0"
          >
            <Volume2 className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
          </button>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-xs sm:max-w-sm">
            {q.options.map((opt) => {
              const isCorrectOpt = opt.char === q.correct.char;
              const isWrongPick = answered && opt.char === selected && !isCorrectOpt;
              const showDetail = answered && (isCorrectOpt || isWrongPick);
              const optReading = opt.readings[0];

              let style = "bg-white border-slate-200 text-slate-800 hover:border-indigo-300 hover:shadow-md";
              if (answered) {
                if (isCorrectOpt) style = "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200";
                else if (isWrongPick) style = "bg-rose-50 border-rose-400 text-rose-600";
                else style = "bg-slate-50 border-slate-200 text-slate-400";
              }

              const handleClick = () => {
                if (!answered) { handleSelect(opt.char); return; }
                if (showDetail) {
                  speakReading(opt.char, optReading, opt.char);
                }
              };

              return (
                <motion.button
                  key={opt.char}
                  onClick={handleClick}
                  whileTap={answered ? {} : { scale: 0.93 }}
                  className={`border-2 rounded-2xl py-3 sm:py-4 font-bold transition-all flex flex-col items-center gap-0.5 ${style}`}
                >
                  <span className="text-4xl sm:text-5xl">{opt.char}</span>
                  {showDetail && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center mt-1"
                    >
                      <span className={`text-xs font-mono ${isCorrectOpt ? "text-emerald-500" : "text-rose-400"}`}>
                        {optReading.pinyin}
                      </span>
                      <span className={`text-xs font-medium ${isCorrectOpt ? "text-emerald-600" : "text-rose-500"}`}>
                        {optReading.words.join("、")}
                      </span>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:py-4 flex flex-col items-center gap-2"
            >
              <div className="w-full max-w-sm text-center">
                {isCorrect ? (
                  <p className="text-emerald-600 font-bold text-sm flex items-center justify-center gap-1.5">
                    <Check className="w-5 h-5" /> 太棒了！
                  </p>
                ) : (
                  <p className="text-rose-500 font-bold text-sm flex items-center justify-center gap-1.5">
                    <XIcon className="w-4 h-4" /> 答错了，点字听读音
                  </p>
                )}
              </div>

              <button
                onClick={handleNext}
                className={`w-full max-w-sm py-3 rounded-xl font-bold text-base active:scale-[0.98] transition-all ${
                  isCorrect
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-indigo-500 text-white hover:bg-indigo-600"
                }`}
              >
                {qIdx < questions.length - 1 ? "下一题 →" : "查看结果"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
