"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { allChars, charGroups } from "@/data/characters";
import { GroupRangeSelector } from "./GroupRangeSelector";

type RangeMode = "all-learned" | "by-group";

export function ListenQuizSettings({
  onStart,
  onBack,
  learnedChars,
}: {
  onStart: (groupIds?: string[]) => void;
  onBack: () => void;
  learnedChars: Set<string>;
}) {
  const [rangeMode, setRangeMode] = useState<RangeMode>("all-learned");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    new Set(charGroups.map((g) => g.id))
  );

  const isByGroup = rangeMode === "by-group";

  const learnedSingleCount = allChars.filter(
    (c) => learnedChars.has(c.char) && c.readings.length === 1
  ).length;

  const groupSingleCount = allChars.filter(
    (c) => selectedGroups.has(c.groupId) && c.readings.length === 1
  ).length;

  const availableCount = isByGroup ? groupSingleCount : learnedSingleCount;
  const canStart = availableCount >= 9;

  return (
    <div className="flex flex-col h-dvh">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">九格顺选设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 max-w-xl mx-auto w-full">
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
            从已学的字中智能出 9 个字，排成 3×3 方阵，听音顺序选出。
            <span className="text-slate-400"> （可用 {learnedSingleCount} 个单音字）</span>
          </p>
        )}

        {isByGroup && (
          <>
            <p className="text-sm text-slate-500 mb-4">
              选择要练习的课程范围（共 {groupSingleCount} 个单音字）
            </p>
            <GroupRangeSelector selected={selectedGroups} setSelected={setSelectedGroups} />
          </>
        )}

        <button
          disabled={!canStart}
          onClick={() => onStart(isByGroup ? [...selectedGroups] : undefined)}
          className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-lg hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          开始游戏 🎮
        </button>
        {!canStart && (
          <p className="text-xs text-rose-500 mt-2 text-center">
            {isByGroup
              ? `所选范围至少需要 9 个单音字（当前 ${groupSingleCount} 个）`
              : `需先学习至少 9 个单音字才能开始游戏（当前 ${learnedSingleCount} 个）`}
          </p>
        )}
      </div>
    </div>
  );
}
