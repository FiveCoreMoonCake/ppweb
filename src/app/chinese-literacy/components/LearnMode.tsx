"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { charGroups } from "@/data/characters";
import { stopAll } from "../lib/voice";
import { loadProgressFromDB, saveProgressChar, clearProgressChars } from "../lib/supabase-progress";
import { getConfusablePairs } from "../lib/confusables";
import { getPrimaryWordPair } from "../lib/word-pairs";
import { CharCard } from "./CharCard";
import { CompareCard } from "./CompareCard";
import { WordPairCard } from "./WordPairCard";
import { allChars } from "@/data/characters";

const _validCharSet = new Set(allChars.map((c) => c.char));

export function LearnMode({ onBack, userId }: { onBack: () => void; userId: string }) {
  const [groupIdx, setGroupIdx] = useState(0);
  const [cardIdx, setCardIdx] = useState(0);
  const [learned, setLearned] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    loadProgressFromDB(userId).then(async (loaded) => {
      // Clean up legacy orphans: chars in DB that are no longer in the dataset
      // (caused by an old bug that auto-marked word-pair partners not present
      // in characters.ts, e.g. “认” / “害”).
      const orphans = [...loaded].filter((c) => !_validCharSet.has(c));
      if (orphans.length > 0) {
        await clearProgressChars(userId, orphans);
        for (const c of orphans) loaded.delete(c);
      }
      setLearned(loaded);
    });
  }, [userId]);

  const group = charGroups[groupIdx];
  const card = group.chars[cardIdx];

  const wordPair = getPrimaryWordPair(card.char);

  /** Check if charIdx is the partner of a word pair whose primary char is the previous card */
  const isWordPairPartner = (gIdx: number, cIdx: number): boolean => {
    if (cIdx <= 0) return false;
    const prevChar = charGroups[gIdx].chars[cIdx - 1].char;
    const curChar = charGroups[gIdx].chars[cIdx].char;
    const wp = getPrimaryWordPair(prevChar);
    return !!wp && wp.chars.includes(curChar);
  };

  // Mark current card (and word pair partner) as learned
  useEffect(() => {
    if (!card) return;
    const charsToLearn = [card.char];
    if (wordPair) {
      const partner = wordPair.chars.find((c) => c !== card.char);
      // Only mark partner if it actually exists in the dataset — prevents
      // orphan progress entries (“认”, “害” 等 不存在的伙伴字).
      if (partner && _validCharSet.has(partner)) charsToLearn.push(partner);
    }
    setLearned((prev) => {
      if (charsToLearn.every((c) => prev.has(c))) return prev;
      const next = new Set(prev);
      for (const c of charsToLearn) {
        if (!next.has(c)) {
          next.add(c);
          saveProgressChar(userId, c);
        }
      }
      return next;
    });
  }, [card, userId, wordPair]);

  const prev = () => {
    stopAll();
    setShowCompare(false);
    let newG = groupIdx;
    let newC = cardIdx - 1;
    if (newC < 0) return;
    // Skip word pair partner going backward
    if (isWordPairPartner(newG, newC) && newC > 0) newC--;
    setCardIdx(newC);
  };
  const next = () => {
    stopAll();
    setShowCompare(false);
    if (cardIdx < group.chars.length - 1) {
      let newC = cardIdx + 1;
      // Skip word pair partner going forward
      if (isWordPairPartner(groupIdx, newC) && newC < group.chars.length - 1) newC++;
      setCardIdx(newC);
    } else if (groupIdx < charGroups.length - 1) {
      setGroupIdx((g) => g + 1);
      setCardIdx(0);
    }
  };
  const selectGroup = (i: number) => { stopAll(); setShowCompare(false); setGroupIdx(i); setCardIdx(0); setSidebarOpen(false); };

  // Filter out confusable pairs that exactly match current word pair
  const confusablePairsForCard = getConfusablePairs(card.char).filter((cp) => {
    if (!wordPair) return true;
    const [a, b] = cp.chars;
    return !(wordPair.chars.includes(a) && wordPair.chars.includes(b));
  });
  const hasConfusables = confusablePairsForCard.length > 0;

  const learnedInGroup = group.chars.filter((c) => learned.has(c.char)).length;
  const isLastCard = cardIdx === group.chars.length - 1;
  const hasNextGroup = groupIdx < charGroups.length - 1;

  const resetGroup = async () => {
    const chars = group.chars.map((c) => c.char);
    const learnedHere = chars.filter((c) => learned.has(c));
    if (learnedHere.length === 0) return;
    if (!window.confirm(`确定要清空「${group.name}」的已学记录吗？\n\n将重置 ${learnedHere.length} 个字的学习状态和答题记录。`)) return;
    setLearned((prev) => {
      const next = new Set(prev);
      for (const c of chars) next.delete(c);
      return next;
    });
    setCardIdx(0);
    await clearProgressChars(userId, chars);
  };

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
            {learnedInGroup > 0 && (
              <button
                onClick={resetGroup}
                className="ml-2 text-[11px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 active:scale-95 transition-all font-semibold"
                title={`清空${group.name}的已学记录，重新学习`}
              >
                🔄 重学本期
              </button>
            )}
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
