"use client";

import React from "react";
import { Volume2 } from "lucide-react";
import type { CharItem } from "@/data/characters";
import { speakChar } from "../lib/voice";

export function PixelEmoji({ emoji, size = "md" }: { emoji: string; size?: "sm" | "md" | "lg" }) {
  const sizeMap = { sm: 40, md: 56, lg: 80 };
  const dim = sizeMap[size];
  const bw = size === "sm" ? 2 : 3;
  const ts = { sm: "text-xl", md: "text-2xl", lg: "text-4xl" };
  return (
    <span
      className="inline-flex items-center justify-center rounded-sm bg-gradient-to-br from-emerald-800 to-emerald-950 shadow-[inset_0_0_8px_rgba(0,0,0,0.3)]"
      style={{
        width: dim,
        height: dim,
        borderWidth: bw,
        borderStyle: "solid",
        borderColor: "#065f46 #022c22 #022c22 #065f46",
        imageRendering: "pixelated",
      }}
    >
      <span className={`${ts[size]} drop-shadow-[0_2px_1px_rgba(0,0,0,0.5)]`}>{emoji}</span>
    </span>
  );
}

export function CharCard({ item, compact = false }: { item: CharItem; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center ${compact ? "gap-1" : "gap-2 sm:gap-3"}`}>
      <div className="flex gap-2">
        {item.readings.map((r, i) => <PixelEmoji key={i} emoji={r.emoji} size={compact ? "sm" : "lg"} />)}
      </div>

      <div className={`flex flex-wrap justify-center gap-x-2 text-slate-500 font-medium ${compact ? "text-sm" : "text-lg sm:text-xl"}`}>
        {item.readings.map((r, i) => (
          <span key={i}>{r.pinyin}</span>
        ))}
      </div>

      <p className={`font-bold text-slate-800 ${compact ? "text-4xl" : "text-7xl sm:text-8xl"}`}>
        {item.char}
      </p>

      <div className={`flex flex-col items-center ${compact ? "gap-1" : "gap-1.5"}`}>
        {item.readings.map((r, i) => (
          <div key={i} className={`flex items-center gap-2 ${compact ? "text-sm" : "text-lg sm:text-xl"}`}>
            <span className="text-slate-400 text-xs font-mono">{r.pinyin}</span>
            <div className="flex gap-2 text-indigo-600 font-medium">
              {r.words.map((w, wi) => (
                <span key={wi}>{w}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {item.explain && !compact && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center max-w-[300px] leading-relaxed">
          {item.explain}
        </p>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); speakChar(item); }}
        className={`mt-1 flex items-center gap-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 active:scale-95 transition-all ${
          compact ? "px-4 py-2 text-sm" : "px-5 py-2.5 text-base"
        }`}
      >
        <Volume2 className={compact ? "w-4 h-4" : "w-5 h-5"} /> 朗读
      </button>
    </div>
  );
}
