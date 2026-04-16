"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { charGroups, allChars } from "@/data/characters";

type RangeMode = "all-learned" | "by-group";

function GroupRangeSelector({
  selected,
  setSelected,
}: {
  selected: Set<string>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const presets = [
    { label: "1-5课", end: 5 },
    { label: "1-10课", end: 10 },
    { label: "1-15课", end: 15 },
    { label: "1-20课", end: 20 },
    { label: "全部", end: charGroups.length },
  ];

  const selectRange = (end: number) => {
    setSelected(new Set(charGroups.slice(0, end).map((g) => g.id)));
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {presets.map((p) => {
          const ids = new Set(charGroups.slice(0, p.end).map((g) => g.id));
          const isActive = ids.size === selected.size && [...ids].every((id) => selected.has(id));
          return (
            <button
              key={p.label}
              onClick={() => selectRange(p.end)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                isActive
                  ? "bg-indigo-500 text-white"
                  : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          onClick={() => setSelected(new Set())}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 text-slate-500 font-semibold hover:bg-slate-100"
        >
          清空
        </button>
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-5 gap-1.5 mb-8">
        {charGroups.map((g) => (
          <button
            key={g.id}
            onClick={() => toggle(g.id)}
            className={`px-2 py-2 rounded-lg border text-xs font-semibold transition-all ${
              selected.has(g.id)
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>
    </>
  );
}

export function QuizSettings({
  onStart,
  onBack,
  learnedCount,
}: {
  onStart: (count: number, groupIds?: string[]) => void;
  onBack: () => void;
  learnedCount: number;
}) {
  const [count, setCount] = useState(10);
  const [rangeMode, setRangeMode] = useState<RangeMode>("all-learned");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    new Set(charGroups.map((g) => g.id))
  );

  const isByGroup = rangeMode === "by-group";

  // Pool size depends on range mode
  const poolSize = isByGroup
    ? allChars.filter((c) => selectedGroups.has(c.groupId)).length
    : learnedCount;

  const counts = [5, 10, 15, 20, 30, 50];
  const effectiveCount = Math.min(count, poolSize);

  // Minimum chars needed for quiz (need 4 for distractors)
  const canStart = poolSize >= 4;

  return (
    <div className="flex flex-col h-dvh">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">测验设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 max-w-xl mx-auto w-full">
        {/* Range mode toggle */}
        <h2 className="font-bold text-slate-700 mb-3">出题范围</h2>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setRangeMode("all-learned")}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
              !isByGroup
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            📚 已学内容
          </button>
          <button
            onClick={() => setRangeMode("by-group")}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
              isByGroup
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            📖 按课选择
          </button>
        </div>

        {!isByGroup && (
          <p className="text-sm text-slate-500 mb-6">
            从已学的 {learnedCount} 个字中智能出题，优先测试新字和易错字。
          </p>
        )}

        {isByGroup && (
          <>
            <p className="text-sm text-slate-500 mb-4">
              选择要测验的课程范围（共 {poolSize} 个字）
            </p>
            <GroupRangeSelector selected={selectedGroups} setSelected={setSelectedGroups} />
          </>
        )}

        <h2 className="font-bold text-slate-700 mb-3">题目数量</h2>
        <div className="flex flex-wrap gap-2 mb-8">
          {counts.map((n) => (
            <button
              key={n}
              disabled={n > poolSize}
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
          disabled={!canStart}
          onClick={() =>
            onStart(
              effectiveCount,
              isByGroup ? [...selectedGroups] : undefined
            )
          }
          className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-lg hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          开始测验 🚀
        </button>
        {!canStart && (
          <p className="text-xs text-rose-500 mt-2 text-center">
            {isByGroup
              ? "所选范围至少需要 4 个字才能开始测验"
              : "需先学习至少 4 个字才能开始测验"}
          </p>
        )}
      </div>
    </div>
  );
}
