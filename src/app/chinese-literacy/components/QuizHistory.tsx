"use client";

import React from "react";
import { ArrowLeft, Trophy, Target } from "lucide-react";
import type { QuizHistoryEntry, ListenHistoryEntry } from "../lib/quiz-history";
import { formatTimestamp } from "../lib/quiz-history";

type Tab = "quiz" | "listen";

export function QuizHistory({
  quizHistory,
  listenHistory,
  onBack,
  onOpenQuiz,
  onOpenListen,
}: {
  quizHistory: QuizHistoryEntry[];
  listenHistory: ListenHistoryEntry[];
  onBack: () => void;
  onOpenQuiz: (idx: number) => void;
  onOpenListen: (idx: number) => void;
}) {
  const [tab, setTab] = React.useState<Tab>("quiz");

  return (
    <div className="flex flex-col h-dvh bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">历史结果</h1>
      </header>

      <div className="bg-white border-b border-slate-200 px-4 shrink-0">
        <div className="flex gap-1 max-w-lg mx-auto">
          <button
            onClick={() => setTab("quiz")}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
              tab === "quiz"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            🧩 测验模式
          </button>
          <button
            onClick={() => setTab("listen")}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
              tab === "listen"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            🎮 九格顺选
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        {tab === "quiz" ? (
          <QuizList entries={quizHistory} onOpen={onOpenQuiz} />
        ) : (
          <ListenList entries={listenHistory} onOpen={onOpenListen} />
        )}
        <p className="text-xs text-slate-400 text-center mt-6">
          仅保留最近 3 次结果
        </p>
      </div>
    </div>
  );
}

function QuizList({
  entries,
  onOpen,
}: {
  entries: QuizHistoryEntry[];
  onOpen: (idx: number) => void;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon="🧩"
        text="还没有测验记录"
        hint="完成一次测验后，这里会显示最近 3 次结果"
      />
    );
  }
  return (
    <ul className="space-y-3">
      {entries.map((e, i) => {
        const total = e.answers.length;
        const correct = e.answers.filter((a) => a.isCorrect).length;
        const pct = total ? Math.round((correct / total) * 100) : 0;
        const wrongChars = e.answers.filter((a) => !a.isCorrect).map((a) => a.question.correct.char);
        return (
          <li key={e.timestamp}>
            <button
              onClick={() => onOpen(i)}
              className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-bold text-slate-700">
                    {formatTimestamp(e.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-2xl font-bold ${pct === 100 ? "text-emerald-600" : pct >= 80 ? "text-indigo-600" : pct >= 50 ? "text-amber-600" : "text-rose-500"}`}>
                    {pct}%
                  </span>
                  {pct === 100 && <Trophy className="w-4 h-4 text-amber-500" />}
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                答对 {correct} / {total} 题
              </p>
              {wrongChars.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-slate-400 mr-1">错字：</span>
                  {wrongChars.slice(0, 10).map((c, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-sm font-bold rounded border border-rose-200"
                    >
                      {c}
                    </span>
                  ))}
                  {wrongChars.length > 10 && (
                    <span className="text-xs text-slate-400 self-center">
                      +{wrongChars.length - 10}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-emerald-600 font-medium">全部答对 🎉</p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ListenList({
  entries,
  onOpen,
}: {
  entries: ListenHistoryEntry[];
  onOpen: (idx: number) => void;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon="🎮"
        text="还没有九格顺选记录"
        hint="完成一次九宫格游戏后，这里会显示最近 3 次结果"
      />
    );
  }
  return (
    <ul className="space-y-3">
      {entries.map((e, i) => {
        const mistakes = e.result.totalMistakes;
        const perfect = mistakes === 0;
        const mistakeChars = Array.from(
          new Set([
            ...e.result.mistakes.map((m) => m.target.char),
            ...e.result.mistakes.flatMap((m) => m.wrongTaps),
          ])
        );
        return (
          <li key={e.timestamp}>
            <button
              onClick={() => onOpen(i)}
              className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-amber-300 hover:shadow-sm transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-slate-700">
                    {formatTimestamp(e.timestamp)}
                  </span>
                </div>
                {perfect ? (
                  <div className="flex items-center gap-1 text-emerald-600">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm font-bold">满分</span>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-rose-500">
                    错 {mistakes} 次
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-2">
                九宫格 {e.grid.length} 字
              </p>
              {mistakeChars.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-slate-400 mr-1">涉及：</span>
                  {mistakeChars.slice(0, 10).map((c, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-sm font-bold rounded border border-rose-200"
                    >
                      {c}
                    </span>
                  ))}
                  {mistakeChars.length > 10 && (
                    <span className="text-xs text-slate-400 self-center">
                      +{mistakeChars.length - 10}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-emerald-600 font-medium">一次都没错 🎉</p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState({ icon, text, hint }: { icon: string; text: string; hint: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-5xl mb-3">{icon}</p>
      <p className="text-slate-600 font-bold">{text}</p>
      <p className="text-sm text-slate-400 mt-1">{hint}</p>
    </div>
  );
}
