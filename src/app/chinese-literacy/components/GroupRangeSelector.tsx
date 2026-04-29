"use client";

import React from "react";
import { charGroups } from "@/data/characters";

/**
 * Reusable group range picker (presets 1-N + per-group toggles).
 * Used by 听音选字 and 九格顺选 settings.
 */
export function GroupRangeSelector({
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
