"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { charGroups } from "@/data/characters";
import { stopAll } from "../lib/voice";
import { loadProgressFromDB, saveProgressChar } from "../lib/supabase-progress";
import { getConfusablePairs } from "../lib/confusables";
import { getPrimaryWordPair } from "../lib/word-pairs";
import { CharCard } from "./CharCard";
import { CompareCard } from "./CompareCard";
import { WordPairCard } from "./WordPairCard";

export function LearnMode({ onBack, userId }: { onBack: () => void; userId: string }) {
  const [groupIdx, setGroupIdx] = useState(0);
  const [cardIdx, setCardIdx] = useState(0);
  const [learned, setLearned] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    loadProgressFromDB(userId).then(setLearned);
  }, [userId]);

  const group = charGroups[groupIdx];
  const card = group.chars[cardIdx];

  const wordPair = getPrimaryWordPair(card.char);

  // Mark current card as learned (+ partner char if word pair)
  useEffect(() => {
    if (!card) return;
    setLearned((prev) => {
      const next = new Set(prev);
      let changed = false;
      if (!next.has(card.char)) { next.add(card.char); saveProgressChar(userId, card.char); changed = true; }
      if (wordPair) {
        const partner = wordPair.chars[0] === card.char ? wordPair.chars[1] : wordPair.chars[0];
        if (!next.has(partner)) { next.add(partner); saveProgressChar(userId, partner); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [card, userId, wordPair]);

  const prev = () => { stopAll(); setShowCompare(false); setCardIdx((i) => Math.max(0, i - 1)); };
  const next = () => {
    stopAll();
    setShowCompare(false);
    if (cardIdx < group.chars.length - 1) {
      setCardIdx((i) => i + 1);
    } else if (groupIdx < charGroups.length - 1) {
      setGroupIdx((g) => g + 1);
      setCardIdx(0);
    }
  };
  const selectGroup = (i: number) => { stopAll(); setShowCompare(false); setGroupIdx(i); setCardIdx(0); setSidebarOpen(false); };

  const confusablePairsForCard = getConfusablePairs(card.char);
  const hasConfusables = confusablePairsForCard.length > 0;

  const learnedInGroup = group.chars.filter((c) => learned.has(c.char)).length;
  const isLastCard = cardIdx === group.chars.length - 1;
  const hasNextGroup = groupIdx < charGroups.length - 1;

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Touch swipe support
  const touchStart = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(diff) > 50) { diff > 0 ? prev() : next(); }
    touchStart.current = null;
  };

  return (
    <div className="flex flex-col h-dvh">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">学习模式</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="ml-auto sm:hidden px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-semibold"
        >
          {group.name} ▾
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* PC sidebar */}
        <nav className="hidden sm:flex flex-col w-36 shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
          {charGroups.map((g, i) => {
            const count = g.chars.filter((c) => learned.has(c.char)).length;
            return (
              <button
                key={g.id}
                onClick={() => selectGroup(i)}
                className={`text-left px-3 py-2 border-b border-slate-100 transition-colors ${
                  i === groupIdx ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{g.name}</span>
                  <span className="text-[10px] text-slate-400">{count}/{g.chars.length}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Mobile: group dropdown overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="sm:hidden fixed inset-0 z-20 bg-black/20"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="sm:hidden absolute top-0 left-0 right-0 z-30 bg-white border-b border-slate-200 shadow-lg max-h-[60vh] overflow-y-auto"
              >
                <div className="grid grid-cols-3 gap-px bg-slate-100 p-1">
                  {charGroups.map((g, i) => {
                    const count = g.chars.filter((c) => learned.has(c.char)).length;
                    return (
                      <button
                        key={g.id}
                        onClick={() => selectGroup(i)}
                        className={`px-2 py-2.5 text-center rounded-lg transition-colors ${
                          i === groupIdx ? "bg-indigo-100 text-indigo-700 font-bold" : "bg-white text-slate-600"
                        }`}
                      >
                        <p className="text-xs font-semibold">{g.name}</p>
                        <p className="text-[10px] text-slate-400">{count}/{g.chars.length}</p>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Card area */}
        <div
          className="flex-1 flex flex-col items-center justify-center px-4 py-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
            <span className="font-semibold text-indigo-600">{group.name}</span>
            <span>·</span>
            <span>{learnedInGroup}/{group.chars.length} 已学</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${group.id}-${cardIdx}-${showCompare ? 'cmp' : 'card'}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-10 w-full max-w-[440px]"
            >
              {showCompare ? (
                <div className="flex flex-col gap-4">
                  {confusablePairsForCard.map((pair, i) => (
                    <CompareCard key={i} pair={pair} />
                  ))}
                </div>
              ) : wordPair ? (
                <WordPairCard pair={wordPair} />
              ) : (
                <CharCard item={card} />
              )}
            </motion.div>
          </AnimatePresence>

          {hasConfusables && (
            <button
              onClick={() => setShowCompare(!showCompare)}
              className="mt-3 px-4 py-2 rounded-xl bg-amber-100 text-amber-800 text-sm font-bold hover:bg-amber-200 active:scale-95 transition-all"
            >
              {showCompare ? "🔙 返回字卡" : `🔍 易混字对比 (${confusablePairsForCard.length})`}
            </button>
          )}

          <div className="flex items-center gap-6 mt-5">
            <button
              onClick={prev}
              disabled={cardIdx === 0 && groupIdx === 0}
              className="p-3 rounded-full bg-white border border-slate-200 shadow-sm disabled:opacity-30 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-6 h-6 text-slate-600" />
            </button>
            <span className="text-sm text-slate-400 font-medium tabular-nums">
              {cardIdx + 1} / {group.chars.length}
            </span>
            <button
              onClick={next}
              disabled={isLastCard && !hasNextGroup}
              className="p-3 rounded-full bg-white border border-slate-200 shadow-sm disabled:opacity-30 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <ChevronRight className="w-6 h-6 text-slate-600" />
            </button>
          </div>
          {isLastCard && hasNextGroup && (
            <p className="text-xs text-indigo-500 mt-1">→ 继续将进入{charGroups[groupIdx + 1].name}</p>
          )}
        </div>
      </div>
    </div>
  );
}
