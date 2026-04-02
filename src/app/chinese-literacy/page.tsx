"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, ChevronLeft, ChevronRight, ArrowLeft, RotateCcw, Check, X as XIcon } from "lucide-react";
import { charGroups, allChars, type CharItem, type CharGroup } from "@/data/characters";

/* ─── helpers ─── */

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = 0.75;
  window.speechSynthesis.speak(u);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PROGRESS_KEY = "chinese-literacy-progress";

function loadProgress(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveProgress(set: Set<string>) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...set]));
}

/* ─── CharCard (shared) ─── */

function CharCard({ item, compact = false }: { item: CharItem; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center ${compact ? "gap-1" : "gap-2 sm:gap-3"}`}>
      <span className={compact ? "text-3xl" : "text-5xl sm:text-6xl"}>{item.emoji}</span>
      <p className={`text-slate-500 font-medium ${compact ? "text-sm" : "text-lg sm:text-xl"}`}>
        {item.pinyin}
      </p>
      <p className={`font-bold text-slate-800 ${compact ? "text-4xl" : "text-7xl sm:text-8xl"}`}>
        {item.char}
      </p>
      <div className={`flex gap-3 ${compact ? "text-base" : "text-xl sm:text-2xl"} text-indigo-600 font-medium`}>
        <span>{item.words[0]}</span>
        <span className="text-slate-300">|</span>
        <span>{item.words[1]}</span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); speak(item.char); }}
        className={`mt-1 flex items-center gap-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 active:scale-95 transition-all ${
          compact ? "px-4 py-2 text-sm" : "px-5 py-2.5 text-base"
        }`}
      >
        <Volume2 className={compact ? "w-4 h-4" : "w-5 h-5"} /> 朗读
      </button>
    </div>
  );
}

/* ─── Learn Mode ─── */

function LearnMode({ onBack }: { onBack: () => void }) {
  const [groupIdx, setGroupIdx] = useState(0);
  const [cardIdx, setCardIdx] = useState(0);
  const [learned, setLearned] = useState<Set<string>>(new Set());

  useEffect(() => setLearned(loadProgress()), []);

  const group = charGroups[groupIdx];
  const card = group.chars[cardIdx];

  // Mark current card as learned
  useEffect(() => {
    if (!card) return;
    setLearned((prev) => {
      if (prev.has(card.char)) return prev;
      const next = new Set(prev);
      next.add(card.char);
      saveProgress(next);
      return next;
    });
  }, [card]);

  const prev = () => setCardIdx((i) => Math.max(0, i - 1));
  const next = () => setCardIdx((i) => Math.min(group.chars.length - 1, i + 1));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">学习模式</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Group sidebar - scrollable on mobile as horizontal tabs */}
        <nav className="hidden sm:flex flex-col w-48 shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
          {charGroups.map((g, i) => {
            const count = g.chars.filter((c) => learned.has(c.char)).length;
            return (
              <button
                key={g.id}
                onClick={() => { setGroupIdx(i); setCardIdx(0); }}
                className={`text-left px-4 py-3 border-b border-slate-100 transition-colors ${
                  i === groupIdx ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-semibold">{g.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{count}/{g.chars.length} 已学</p>
              </button>
            );
          })}
        </nav>

        {/* Mobile group tabs */}
        <div className="sm:hidden absolute top-[53px] left-0 right-0 z-10 bg-white border-b border-slate-200 flex overflow-x-auto">
          {charGroups.map((g, i) => (
            <button
              key={g.id}
              onClick={() => { setGroupIdx(i); setCardIdx(0); }}
              className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                i === groupIdx ? "border-indigo-500 text-indigo-700" : "border-transparent text-slate-500"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Card area */}
        <div className="flex-1 flex flex-col items-center justify-center relative pt-10 sm:pt-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${group.id}-${cardIdx}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-10 w-[85vw] sm:w-[400px] max-w-[420px]"
            >
              <CharCard item={card} />
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center gap-6 mt-6">
            <button
              onClick={prev}
              disabled={cardIdx === 0}
              className="p-3 rounded-full bg-white border border-slate-200 shadow-sm disabled:opacity-30 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-6 h-6 text-slate-600" />
            </button>
            <span className="text-sm text-slate-400 font-medium tabular-nums">
              {cardIdx + 1} / {group.chars.length}
            </span>
            <button
              onClick={next}
              disabled={cardIdx === group.chars.length - 1}
              className="p-3 rounded-full bg-white border border-slate-200 shadow-sm disabled:opacity-30 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <ChevronRight className="w-6 h-6 text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Quiz Types ─── */

interface QuizQuestion {
  correct: CharItem;
  options: CharItem[];
}

interface QuizAnswer {
  question: QuizQuestion;
  selected: string;
  isCorrect: boolean;
}

function generateQuiz(groupIds: string[], count: number): QuizQuestion[] {
  const pool = allChars.filter((c) => groupIds.includes(c.groupId));
  const picked = shuffle(pool).slice(0, count);
  return picked.map((correct) => {
    // Pick 3 distractors, prefer same group
    const sameGroup = pool.filter((c) => c.char !== correct.char && c.groupId === correct.groupId);
    const otherGroup = pool.filter((c) => c.char !== correct.char && c.groupId !== correct.groupId);
    const distractors = shuffle([...sameGroup, ...otherGroup]).slice(0, 3);
    return {
      correct,
      options: shuffle([correct, ...distractors]),
    };
  });
}

/* ─── Quiz Settings ─── */

function QuizSettings({ onStart, onBack }: { onStart: (groupIds: string[], count: number) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(charGroups.map((g) => g.id)));
  const [count, setCount] = useState(10);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maxCount = allChars.filter((c) => selected.has(c.groupId)).length;
  const counts = [5, 10, 15, 20];

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">测验设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 max-w-lg mx-auto w-full">
        <h2 className="font-bold text-slate-700 mb-3">选择出题范围</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
          {charGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => toggle(g.id)}
              className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                selected.has(g.id)
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              {g.name}
              <span className="block text-xs font-normal mt-0.5 opacity-70">{g.chars.length} 字</span>
            </button>
          ))}
        </div>

        <h2 className="font-bold text-slate-700 mb-3">题目数量</h2>
        <div className="flex flex-wrap gap-2 mb-8">
          {counts.map((n) => (
            <button
              key={n}
              disabled={n > maxCount}
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
          disabled={selected.size === 0 || maxCount < 4}
          onClick={() => onStart([...selected], Math.min(count, maxCount))}
          className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-lg hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          开始测验 🚀
        </button>
        {maxCount < 4 && selected.size > 0 && (
          <p className="text-xs text-rose-500 mt-2 text-center">所选范围需至少 4 个字才能出题</p>
        )}
      </div>
    </div>
  );
}

/* ─── Quiz Play ─── */

function QuizPlay({
  questions,
  onFinish,
  onBack,
}: {
  questions: QuizQuestion[];
  onFinish: (answers: QuizAnswer[]) => void;
  onBack: () => void;
}) {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const hasSpoken = useRef(false);

  const q = questions[qIdx];
  const isCorrect = selected === q.correct.char;
  const answered = selected !== null;

  // Auto-speak the correct character when question loads
  useEffect(() => {
    hasSpoken.current = false;
    const timer = setTimeout(() => {
      if (!hasSpoken.current) {
        speak(q.correct.char);
        hasSpoken.current = true;
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [qIdx, q.correct.char]);

  const handleSelect = (char: string) => {
    if (answered) return;
    setSelected(char);
    const correct = char === q.correct.char;
    const answer: QuizAnswer = { question: q, selected: char, isCorrect: correct };
    setAnswers((prev) => [...prev, answer]);

    if (correct) {
      // Auto-speak and advance after delay
      setTimeout(() => speak(q.correct.char), 300);
      setTimeout(() => {
        if (qIdx < questions.length - 1) {
          setSelected(null);
          setQIdx((i) => i + 1);
        } else {
          onFinish([...answers, answer]);
        }
      }, 2200);
    }
  };

  const handleNext = () => {
    if (qIdx < questions.length - 1) {
      setSelected(null);
      setQIdx((i) => i + 1);
    } else {
      onFinish(answers);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-slate-500 tabular-nums">
          {qIdx + 1} / {questions.length}
        </span>
        {/* Progress bar */}
        <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${((qIdx + (answered ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">
        <p className="text-slate-500 font-medium text-base">听一听，选一选 👂</p>

        <button
          onClick={() => speak(q.correct.char)}
          className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 active:scale-95 transition-all"
        >
          <Volume2 className="w-10 h-10 text-indigo-600" />
        </button>

        {/* Options 2x2 grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-xs sm:max-w-sm">
          {q.options.map((opt) => {
            let style = "bg-white border-slate-200 text-slate-800 hover:border-indigo-300 hover:shadow-md";
            if (answered) {
              if (opt.char === q.correct.char) style = "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200";
              else if (opt.char === selected) style = "bg-rose-50 border-rose-400 text-rose-600";
              else style = "bg-slate-50 border-slate-200 text-slate-400";
            }
            return (
              <motion.button
                key={opt.char}
                onClick={() => handleSelect(opt.char)}
                disabled={answered}
                whileTap={answered ? {} : { scale: 0.93 }}
                className={`border-2 rounded-2xl py-5 sm:py-7 text-4xl sm:text-5xl font-bold transition-all ${style}`}
              >
                {opt.char}
              </motion.button>
            );
          })}
        </div>

        {/* Feedback area */}
        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xs sm:max-w-sm"
            >
              {isCorrect ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-lg mb-3">
                  <Check className="w-6 h-6" /> 太棒了！
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-rose-500 font-bold text-lg mb-3">
                  <XIcon className="w-5 h-5" /> 再想想，正确答案是「{q.correct.char}」
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <CharCard item={q.correct} compact />
              </div>

              {!isCorrect && (
                <button
                  onClick={handleNext}
                  className="mt-4 w-full py-3 rounded-xl bg-indigo-500 text-white font-bold text-base hover:bg-indigo-600 active:scale-[0.98] transition-all"
                >
                  {qIdx < questions.length - 1 ? "下一题 →" : "查看结果"}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Quiz Results ─── */

function QuizResults({
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

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">测验结果</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 max-w-lg mx-auto w-full">
        {/* Score */}
        <div className="text-center mb-8">
          <p className="text-6xl font-bold mb-2">
            {pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📚"}
          </p>
          <p className="text-4xl font-bold text-slate-800">{pct}%</p>
          <p className="text-slate-500 mt-1">答对 {correct} / {total} 题</p>
        </div>

        {/* Wrong answers */}
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

        {/* Card popup for reviewing wrong answers */}
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

        {/* Actions */}
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

/* ─── Main Page ─── */

type Mode = "home" | "learn" | "quiz-settings" | "quiz-play" | "quiz-results";

export default function ChineseLiteracyPage() {
  const [mode, setMode] = useState<Mode>("home");
  const [isClient, setIsClient] = useState(false);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [lastQuizConfig, setLastQuizConfig] = useState<{ groupIds: string[]; count: number } | null>(null);

  useEffect(() => setIsClient(true), []);

  const startQuiz = useCallback((groupIds: string[], count: number) => {
    const questions = generateQuiz(groupIds, count);
    setQuizQuestions(questions);
    setQuizAnswers([]);
    setLastQuizConfig({ groupIds, count });
    setMode("quiz-play");
  }, []);

  const retryQuiz = useCallback(() => {
    if (lastQuizConfig) startQuiz(lastQuizConfig.groupIds, lastQuizConfig.count);
  }, [lastQuizConfig, startQuiz]);

  if (!isClient) {
    return <div className="h-screen bg-slate-50 flex items-center justify-center text-slate-400">加载中...</div>;
  }

  if (mode === "learn") return <LearnMode onBack={() => setMode("home")} />;
  if (mode === "quiz-settings") return <QuizSettings onStart={startQuiz} onBack={() => setMode("home")} />;
  if (mode === "quiz-play")
    return (
      <QuizPlay
        questions={quizQuestions}
        onFinish={(a) => { setQuizAnswers(a); setMode("quiz-results"); }}
        onBack={() => setMode("home")}
      />
    );
  if (mode === "quiz-results")
    return <QuizResults answers={quizAnswers} onRetry={retryQuiz} onBack={() => setMode("home")} />;

  // Home
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="text-center mb-10">
        <p className="text-6xl mb-4">📖</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight">中文识字</h1>
        <p className="text-slate-500 mt-2 text-sm sm:text-base">
          {allChars.length} 个常用字 · {charGroups.length} 个分组
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-md">
        <button
          onClick={() => setMode("learn")}
          className="flex-1 py-5 rounded-2xl bg-white border-2 border-emerald-200 shadow-sm hover:shadow-md hover:border-emerald-400 active:scale-[0.97] transition-all text-center"
        >
          <span className="text-3xl block mb-2">🎴</span>
          <span className="font-bold text-lg text-emerald-700">学习模式</span>
          <span className="block text-xs text-slate-400 mt-1">认识汉字，逐个学习</span>
        </button>
        <button
          onClick={() => setMode("quiz-settings")}
          className="flex-1 py-5 rounded-2xl bg-white border-2 border-indigo-200 shadow-sm hover:shadow-md hover:border-indigo-400 active:scale-[0.97] transition-all text-center"
        >
          <span className="text-3xl block mb-2">🧩</span>
          <span className="font-bold text-lg text-indigo-700">测验模式</span>
          <span className="block text-xs text-slate-400 mt-1">听音辨字，检验学习</span>
        </button>
      </div>

      <a href="/" className="mt-10 text-sm text-slate-400 hover:text-slate-600 transition-colors">
        ← 返回工具箱
      </a>
    </div>
  );
}
