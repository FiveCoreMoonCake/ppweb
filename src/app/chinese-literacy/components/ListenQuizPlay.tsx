"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Volume2, ArrowLeft, Check } from "lucide-react";
import type { CharItem } from "@/data/characters";
import type { CharRecord, ListenQuizResult, ListenRoundMistake } from "../lib/types";
import { stopAll, playPrerecorded, speak } from "../lib/voice";
import { playCorrectSound, playWrongSound } from "../lib/sound-effects";
import { recordAnswerLocal } from "../lib/spaced-repetition";
import { generateListenGrid } from "../lib/quiz-engine";
import { shuffle } from "../lib/shuffle";

export function ListenQuizPlay({
  progress,
  onFinish,
  onBack,
  records,
  userId,
  onRecordsChange,
  groupIds,
}: {
  progress: Set<string>;
  onFinish: (result: ListenQuizResult, grid: CharItem[]) => void;
  onBack: () => void;
  records: Record<string, CharRecord>;
  userId: string;
  onRecordsChange: (r: Record<string, CharRecord>) => void;
  groupIds?: string[];
}) {
  const [grid, setGrid] = useState<CharItem[]>([]);
  const [queue, setQueue] = useState<number[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [solved, setSolved] = useState<Set<number>>(new Set());
  const [shaking, setShaking] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState<ListenRoundMistake[]>([]);
  const [currentWrongTaps, setCurrentWrongTaps] = useState<string[]>([]);
  const hasSpoken = useRef(false);

  // Initialize grid and queue — Fix E: use Fisher-Yates shuffle
  useEffect(() => {
    const chars = generateListenGrid(progress, records, groupIds);
    setGrid(chars);
    const order = shuffle(chars.map((_, i) => i));
    setQueue(order);
    setCurrentIdx(0);
    setSolved(new Set());
    setMistakes([]);
    setCurrentWrongTaps([]);
  }, [progress, groupIds]);

  const targetGridIdx = queue[currentIdx];
  const targetChar = grid[targetGridIdx];

  const speakTarget = useCallback(() => {
    if (!targetChar) return;
    stopAll();
    const pre = playPrerecorded(targetChar.char);
    if (!pre) speak(targetChar.char);
  }, [targetChar]);

  useEffect(() => {
    if (!targetChar) return;
    hasSpoken.current = false;
    const timer = setTimeout(() => {
      if (!hasSpoken.current) {
        speakTarget();
        hasSpoken.current = true;
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentIdx, targetChar, speakTarget]);

  const handleTap = (gridIdx: number) => {
    if (solved.has(gridIdx)) return;
    if (!targetChar) return;

    if (gridIdx === targetGridIdx) {
      playCorrectSound();
      const newSolved = new Set(solved);
      newSolved.add(gridIdx);
      setSolved(newSolved);

      if (currentWrongTaps.length > 0) {
        setMistakes((prev) => [...prev, { target: targetChar, wrongTaps: [...currentWrongTaps] }]);
      }
      setCurrentWrongTaps([]);

      onRecordsChange(recordAnswerLocal(records, targetChar.char, currentWrongTaps.length === 0, userId));

      if (newSolved.size === grid.length) {
        stopAll();
        const totalMistakes = mistakes.reduce((s, m) => s + m.wrongTaps.length, 0) + currentWrongTaps.length;
        const finalMistakes = currentWrongTaps.length > 0
          ? [...mistakes, { target: targetChar, wrongTaps: [...currentWrongTaps] }]
          : mistakes;
        setTimeout(() => onFinish({ totalMistakes, mistakes: finalMistakes }, grid), 600);
      } else {
        setCurrentIdx((i) => i + 1);
      }
    } else {
      playWrongSound();
      setCurrentWrongTaps((prev) => [...prev, grid[gridIdx].char]);
      onRecordsChange(recordAnswerLocal(records, grid[gridIdx].char, false, userId));
      setShaking(gridIdx);
      setTimeout(() => setShaking(null), 500);
    }
  };

  if (grid.length < 9) {
    return (
      <div className="flex flex-col h-dvh items-center justify-center gap-4 px-4">
        <p className="text-slate-500 text-center">已学的单音字不足 9 个，请先去学习更多字</p>
        <button onClick={onBack} className="px-6 py-2 rounded-xl bg-slate-100 text-slate-600 font-medium">返回</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
        <button onClick={() => { stopAll(); onBack(); }} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-slate-500 tabular-nums">
          {solved.size} / {grid.length}
        </span>
        <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${(solved.size / grid.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-5">
        <p className="text-slate-500 font-medium text-sm">听一听，点一点 👂</p>

        <button
          onClick={speakTarget}
          className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 active:scale-95 transition-all"
        >
          <Volume2 className="w-8 h-8 text-indigo-600" />
        </button>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-xs sm:max-w-sm">
          {grid.map((item, idx) => {
            const isSolved = solved.has(idx);
            const isShaking = shaking === idx;

            let style = "bg-white border-slate-200 text-slate-800 hover:border-indigo-300 hover:shadow-md";
            if (isSolved) {
              style = "bg-emerald-50 border-emerald-400 text-emerald-600";
            }

            return (
              <motion.button
                key={item.char}
                onClick={() => handleTap(idx)}
                disabled={isSolved}
                animate={isShaking ? { x: [0, -8, 8, -8, 8, 0] } : {}}
                transition={isShaking ? { duration: 0.4 } : {}}
                className={`border-2 rounded-2xl aspect-square flex items-center justify-center font-bold text-3xl sm:text-4xl transition-all ${style} ${isSolved ? "opacity-60" : "active:scale-95"}`}
              >
                {item.char}
                {isSolved && (
                  <Check className="w-5 h-5 text-emerald-500 absolute -top-1 -right-1" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
