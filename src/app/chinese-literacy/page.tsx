"use client";

import React, { useState, useEffect, useCallback } from "react";
import { allChars, type CharItem } from "@/data/characters";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/lib/require-auth";

import type { Mode, CharRecord, QuizQuestion, QuizAnswer, ListenQuizResult } from "./lib/types";
import { useVoiceInit } from "./lib/voice";
import { loadProgressFromDB, loadRecordsFromDB } from "./lib/supabase-progress";
import { generateQuiz } from "./lib/quiz-engine";

import { LearnMode } from "./components/LearnMode";
import { QuizSettings } from "./components/QuizSettings";
import { QuizPlay } from "./components/QuizPlay";
import { QuizResults } from "./components/QuizResults";
import { ListenQuizSettings } from "./components/ListenQuizSettings";
import { ListenQuizPlay } from "./components/ListenQuizPlay";
import { ListenQuizResults } from "./components/ListenQuizResults";
import { WrongList } from "./components/WrongList";

function ChineseLiteracyInner() {
  const { user } = useAuth();
  const userId = user!.id;

  const [mode, setMode] = useState<Mode>("home");
  const [isClient, setIsClient] = useState(false);

  // Supabase-backed state
  const [progress, setProgress] = useState<Set<string>>(new Set());
  const [records, setRecords] = useState<Record<string, CharRecord>>({});
  const [dataLoaded, setDataLoaded] = useState(false);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [quizRound, setQuizRound] = useState(0);
  const [lastQuizCount, setLastQuizCount] = useState(10);

  // Listen quiz state
  const [listenResult, setListenResult] = useState<ListenQuizResult | null>(null);
  const [listenGrid, setListenGrid] = useState<CharItem[]>([]);
  const [listenRound, setListenRound] = useState(0);

  useEffect(() => setIsClient(true), []);
  useVoiceInit();

  // Load data from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [prog, recs] = await Promise.all([
        loadProgressFromDB(userId),
        loadRecordsFromDB(userId),
      ]);
      if (cancelled) return;
      setProgress(prog);
      setRecords(recs);
      setDataLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const startQuiz = useCallback((count: number) => {
    const questions = generateQuiz(progress, count, records);
    setQuizQuestions(questions);
    setQuizAnswers([]);
    setQuizRound((r) => r + 1);
    setLastQuizCount(count);
    setMode("quiz-play");
  }, [progress, records]);

  const retryQuiz = useCallback(() => {
    startQuiz(lastQuizCount);
  }, [lastQuizCount, startQuiz]);

  const startListenQuiz = useCallback(() => {
    setListenResult(null);
    setListenRound((r) => r + 1);
    setMode("listen-quiz-play");
  }, []);

  const retryListenQuiz = useCallback(() => {
    startListenQuiz();
  }, [startListenQuiz]);

  if (!isClient || !dataLoaded) {
    return <div className="h-screen bg-slate-50 flex items-center justify-center text-slate-400">加载中...</div>;
  }

  if (mode === "learn") return <LearnMode onBack={() => setMode("home")} userId={userId} />;
  if (mode === "quiz-settings") return <QuizSettings onStart={startQuiz} onBack={() => setMode("home")} learnedCount={progress.size} />;
  if (mode === "listen-quiz-settings") return <ListenQuizSettings onStart={startListenQuiz} onBack={() => setMode("home")} learnedChars={progress} />;
  if (mode === "quiz-play")
    return (
      <QuizPlay
        questions={quizQuestions}
        onFinish={(a) => { setQuizAnswers(a); setMode("quiz-results"); }}
        onBack={() => setMode("home")}
        records={records}
        userId={userId}
        onRecordsChange={setRecords}
      />
    );
  if (mode === "quiz-results")
    return <QuizResults key={quizRound} answers={quizAnswers} onRetry={retryQuiz} onBack={() => setMode("home")} />;
  if (mode === "listen-quiz-play")
    return (
      <ListenQuizPlay
        key={listenRound}
        progress={progress}
        onFinish={(r, g) => { setListenResult(r); setListenGrid(g); setMode("listen-quiz-results"); }}
        onBack={() => setMode("home")}
        records={records}
        userId={userId}
        onRecordsChange={setRecords}
      />
    );
  if (mode === "listen-quiz-results" && listenResult)
    return <ListenQuizResults key={listenRound} result={listenResult} grid={listenGrid} onRetry={retryListenQuiz} onBack={() => setMode("home")} />;
  if (mode === "wrongList")
    return (
      <WrongList
        records={records}
        onBack={() => setMode("home")}
        onStartPractice={(wrongItems) => {
          const wrongCharSet = new Set(wrongItems.map((c) => c.char));
          // Generate from learned chars, then filter to only wrong chars
          const questions = generateQuiz(progress, Math.min(wrongItems.length, 20), records);
          const filtered = questions.filter((q) => wrongCharSet.has(q.correct.char));
          const finalQuestions = filtered.length >= 4 ? filtered : questions.slice(0, Math.min(wrongItems.length, 20));
          setQuizQuestions(finalQuestions);
          setQuizAnswers([]);
          setQuizRound((r) => r + 1);
          setLastQuizCount(finalQuestions.length);
          setMode("quiz-play");
        }}
      />
    );

  // Home
  const progressPct = Math.round((progress.size / allChars.length) * 100);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="text-center mb-10">
        <p className="text-6xl mb-4">📖</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight">中文识字</h1>
        <p className="text-slate-500 mt-2 text-sm sm:text-base">
          {allChars.length} 个常用字 · 智能出题
        </p>
        {progress.size > 0 && (
          <div className="mt-3 flex flex-col items-center gap-1">
            <div className="w-48 h-2 bg-white/60 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs text-slate-400">已学 {progress.size}/{allChars.length} 字（{progressPct}%）</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-lg">
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
          <span className="block text-xs text-slate-400 mt-1">听音辨字，四选一</span>
        </button>
        <button
          onClick={() => setMode("listen-quiz-settings")}
          className="flex-1 py-5 rounded-2xl bg-white border-2 border-amber-200 shadow-sm hover:shadow-md hover:border-amber-400 active:scale-[0.97] transition-all text-center"
        >
          <span className="text-3xl block mb-2">🎮</span>
          <span className="font-bold text-lg text-amber-700">听音选字</span>
          <span className="block text-xs text-slate-400 mt-1">九宫格，听音点字</span>
        </button>
        <button
          onClick={() => setMode("wrongList")}
          className="flex-1 py-5 rounded-2xl bg-white border-2 border-rose-200 shadow-sm hover:shadow-md hover:border-rose-400 active:scale-[0.97] transition-all text-center"
        >
          <span className="text-3xl block mb-2">📋</span>
          <span className="font-bold text-lg text-rose-700">易错字表</span>
          <span className="block text-xs text-slate-400 mt-1">专项复习易错字</span>
        </button>
      </div>

      <a href="/" className="mt-10 text-sm text-slate-400 hover:text-slate-600 transition-colors">
        ← 返回工具箱
      </a>
    </div>
  );
}

export default function ChineseLiteracyPage() {
  return (
    <RequireAuth>
      <ChineseLiteracyInner />
    </RequireAuth>
  );
}
