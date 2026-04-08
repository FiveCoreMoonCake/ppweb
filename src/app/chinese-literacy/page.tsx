"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, ChevronLeft, ChevronRight, ArrowLeft, RotateCcw, Check, X as XIcon } from "lucide-react";
import { charGroups, allChars, type CharItem, type CharGroup } from "@/data/characters";

/* ─── helpers ─── */

/** Preferred Chinese voices ranked by quality (partial match on voice name) */
const VOICE_PRIORITY = [
  "Tingting",       // Apple macOS/iOS
  "Lili",           // Apple
  "Meijia",         // Apple
  "Sinji",          // Apple Cantonese fallback
  "Xiaoxiao",       // Microsoft Azure
  "Yunxi",          // Microsoft Azure  
  "Google",         // Google TTS
];

let _cachedVoice: SpeechSynthesisVoice | null = null;
let _voiceResolved = false;

function getBestChineseVoice(): SpeechSynthesisVoice | null {
  if (_voiceResolved) return _cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const zhVoices = voices.filter((v) => v.lang.startsWith("zh"));
  for (const pref of VOICE_PRIORITY) {
    const match = zhVoices.find((v) => v.name.includes(pref));
    if (match) { _cachedVoice = match; _voiceResolved = true; return match; }
  }
  _cachedVoice = zhVoices.find((v) => v.lang === "zh-CN") ?? zhVoices[0] ?? null;
  _voiceResolved = true;
  return _cachedVoice;
}

/* ── Pre-recorded audio for polyphonic characters ── */
let _manifest: Record<string, string> | null = null;
let _manifestLoaded = false;
let _currentAudio: HTMLAudioElement | null = null;

async function loadManifest() {
  if (_manifestLoaded) return;
  _manifestLoaded = true;
  try {
    const res = await fetch('/audio/manifest.json');
    _manifest = await res.json();
  } catch { _manifest = null; }
}

/**
 * Play pre-recorded audio for a polyphonic reading.
 * Returns a Promise that resolves when playback ends, or null if not found.
 */
/**
 * Play pre-recorded audio. Lookup order:
 *   1. "char-pinyin" (polyphonic reading)
 *   2. "char" (single-reading)
 * Returns a Promise that resolves when done, or null if not found.
 */
function playPrerecorded(char: string, pinyin?: string): Promise<void> | null {
  if (!_manifest) return null;
  // Try polyphonic key first, then single-char key
  const url = (pinyin && _manifest[`${char}-${pinyin}`]) || _manifest[char];
  if (!url) return null;
  if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }
  return new Promise((resolve) => {
    const a = new Audio(url);
    _currentAudio = a;
    const done = () => { if (_currentAudio === a) _currentAudio = null; resolve(); };
    const timer = setTimeout(done, 10000);
    a.onended = () => { clearTimeout(timer); done(); };
    a.onerror = () => { clearTimeout(timer); done(); };
    a.play().catch(() => { clearTimeout(timer); done(); });
  });
}

/* ── Global abort / cancel state ── */
let _abortId = 0;

/** Stop ALL ongoing TTS and audio immediately */
function stopAll() {
  _abortId++;
  if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** Get a configured utterance with best Chinese voice */
function makeUtterance(text: string): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voice = getBestChineseVoice();
  if (!voice) {
    console.warn("[TTS] No Chinese voice available – skipping speech for:", text);
    return null;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;        // set voice FIRST
  u.lang = voice.lang;    // match voice's actual lang tag (zh-CN / zh-TW etc.)
  u.rate = 0.78;
  return u;
}

function speak(text: string) {
  stopAll();
  // Create utterance INSIDE setTimeout — after cancel() has fully processed,
  // some browsers otherwise ignore the voice setting and fall back to English.
  setTimeout(() => {
    const u = makeUtterance(text);
    if (!u) return;
    window.speechSynthesis.speak(u);
  }, 100);
}

function wait(ms: number, abortId: number): Promise<void> {
  return new Promise((r) => {
    if (abortId !== _abortId) { r(); return; }
    setTimeout(r, ms);
  });
}

/** Speak TTS and wait for it to finish, aborts if stopAll() called */
function speakAndWait(text: string, abortId: number): Promise<void> {
  return new Promise((resolve) => {
    if (abortId !== _abortId) { resolve(); return; }
    // Small delay so any recent cancel() has fully processed
    setTimeout(() => {
      if (abortId !== _abortId) { resolve(); return; }
      const u = makeUtterance(text);
      if (!u) { resolve(); return; }
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    }, 80);
  });
}

/**
 * Read all readings of a char.
 * Single reading: TTS "山，，山上，，大山"
 * Polyphonic:     TTS each reading's words sequentially with pauses.
 *                 Context words naturally disambiguate pronunciation
 *                 (e.g. "大夫" reads dài fu, "大小" reads dà xiǎo).
 */
async function speakChar(item: CharItem) {
  stopAll();
  const myId = _abortId;

  if (item.readings.length === 1) {
    const r = item.readings[0];
    // Pre-recorded audio already includes char+words+explain (if any)
    const pre = playPrerecorded(item.char);
    if (pre) {
      await pre;
    } else {
      const text = `${item.char}，，${r.words.join("，，")}`;
      await wait(100, myId);
      if (myId !== _abortId) return;
      const u = makeUtterance(text);
      if (!u) return;
      await new Promise<void>((resolve) => { u.onend = () => resolve(); u.onerror = () => resolve(); window.speechSynthesis.speak(u); });
    }
    return;
  }

  // Polyphonic: play pre-recorded audio for each reading sequentially.
  for (let i = 0; i < item.readings.length; i++) {
    if (myId !== _abortId) return;
    const r = item.readings[i];
    if (i > 0) await wait(600, myId);
    if (myId !== _abortId) return;
    const pre = playPrerecorded(item.char, r.pinyin);
    if (pre) await pre;
    else await speakAndWait(r.words.join("，，"), myId);
  }
  // Polyphonic chars with explain: play pre-recorded explain audio
  if (item.explain) {
    if (myId !== _abortId) return;
    await wait(400, myId);
    if (myId !== _abortId) return;
    const explainPre = playPrerecorded(`${item.char}_explain`);
    if (explainPre) await explainPre;
    else await speakAndWait(item.explain, myId);
  }
}

/** Play a polyphonic reading via pre-recorded audio, falling back to browser TTS */
/** Play a reading via pre-recorded audio, falling back to browser TTS */
function speakReading(char: string, reading: { pinyin: string; words: string[] }, fallbackPrefix?: string) {
  stopAll();
  // Try polyphonic key, then single-char key
  const pre = playPrerecorded(char, reading.pinyin);
  if (pre) return;
  // Fallback to browser TTS
  const text = fallbackPrefix ? `${fallbackPrefix}，，${reading.words.join("，，")}` : reading.words.join("，，");
  setTimeout(() => {
    const u = makeUtterance(text);
    if (!u) return;
    window.speechSynthesis.speak(u);
  }, 100);
}

/** Warm up voice list and load audio manifest */
function useVoiceInit() {
  useEffect(() => {
    loadManifest();
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    getBestChineseVoice();
    const handler = () => { _voiceResolved = false; getBestChineseVoice(); };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
  }, []);
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

/* ─── Minecraft-style emoji block ─── */

function PixelEmoji({ emoji, size = "md" }: { emoji: string; size?: "sm" | "md" | "lg" }) {
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

/* ─── CharCard (shared) ─── */

function CharCard({ item, compact = false }: { item: CharItem; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center ${compact ? "gap-1" : "gap-2 sm:gap-3"}`}>
      <div className="flex gap-2">
        {item.readings.map((r, i) => <PixelEmoji key={i} emoji={r.emoji} size={compact ? "sm" : "lg"} />)}
      </div>

      {/* Pinyin: show all readings */}
      <div className={`flex flex-wrap justify-center gap-x-2 text-slate-500 font-medium ${compact ? "text-sm" : "text-lg sm:text-xl"}`}>
        {item.readings.map((r, i) => (
          <span key={i}>{r.pinyin}</span>
        ))}
      </div>

      <p className={`font-bold text-slate-800 ${compact ? "text-4xl" : "text-7xl sm:text-8xl"}`}>
        {item.char}
      </p>

      {/* Words grouped by reading */}
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

      {/* Explain for abstract chars */}
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

/* ─── Learn Mode ─── */

function LearnMode({ onBack }: { onBack: () => void }) {
  const [groupIdx, setGroupIdx] = useState(0);
  const [cardIdx, setCardIdx] = useState(0);
  const [learned, setLearned] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const prev = () => { stopAll(); setCardIdx((i) => Math.max(0, i - 1)); };
  const next = () => {
    stopAll();
    if (cardIdx < group.chars.length - 1) {
      setCardIdx((i) => i + 1);
    } else if (groupIdx < charGroups.length - 1) {
      // Auto-advance to next group
      setGroupIdx((g) => g + 1);
      setCardIdx(0);
    }
  };
  const selectGroup = (i: number) => { stopAll(); setGroupIdx(i); setCardIdx(0); setSidebarOpen(false); };

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
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">学习模式</h1>
        {/* Mobile: current group selector button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="ml-auto sm:hidden px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-semibold"
        >
          {group.name} ▾
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* PC sidebar - compact with scrolling */}
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
          {/* Group progress bar */}
          <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
            <span className="font-semibold text-indigo-600">{group.name}</span>
            <span>·</span>
            <span>{learnedInGroup}/{group.chars.length} 已学</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${group.id}-${cardIdx}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-10 w-full max-w-[400px]"
            >
              <CharCard item={card} />
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
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

/* ─── Learning Records (spaced repetition) ─── */

interface CharRecord {
  right: number;
  wrong: number;
  lastSeen: string;     // ISO date string
  nextReview: string;   // ISO date string
  interval: number;     // days
}

const RECORDS_KEY = "chinese-literacy-records";

function loadRecords(): Record<string, CharRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveRecords(records: Record<string, CharRecord>) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function recordAnswer(char: string, correct: boolean): Record<string, CharRecord> {
  const records = loadRecords();
  const today = todayStr();
  const prev = records[char] || { right: 0, wrong: 0, lastSeen: today, nextReview: today, interval: 1 };

  if (correct) {
    prev.right++;
    prev.interval = Math.min(prev.interval * 2, 64); // cap at 64 days
    prev.nextReview = addDays(today, prev.interval);
  } else {
    prev.wrong++;
    prev.interval = 1;
    prev.nextReview = addDays(today, 1);
  }
  prev.lastSeen = today;
  records[char] = prev;
  saveRecords(records);
  return records;
}

/* ─── Sound Effects ─── */

function playCorrectSound() {
  try {
    const ctx = new AudioContext();
    // Happy ascending ding
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.3);
    });
  } catch {}
}

function playWrongSound() {
  try {
    const ctx = new AudioContext();
    // Low buzz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 200;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

/* ─── Quiz Types ─── */

interface QuizQuestion {
  correct: CharItem;
  /** Which reading is being tested (index into correct.readings[]) */
  readingIdx: number;
  options: CharItem[];
}

interface QuizAnswer {
  question: QuizQuestion;
  selected: string;
  isCorrect: boolean;
}

/** Pool entry: one entry per reading per char */
interface PoolEntry {
  item: CharItem;
  readingIdx: number;
}

function generateQuiz(groupIds: string[], count: number): QuizQuestion[] {
  const chars = allChars.filter((c) => groupIds.includes(c.groupId));
  const records = loadRecords();
  const today = todayStr();

  // Expand: each reading of each char is a separate pool entry
  const pool: PoolEntry[] = chars.flatMap((item) =>
    item.readings.map((_, ri) => ({ item, readingIdx: ri }))
  );

  // Categorize entries
  const dueForReview: PoolEntry[] = [];   // nextReview <= today
  const highError: PoolEntry[] = [];      // wrong >= 3 and not already due
  const newChars: PoolEntry[] = [];       // never seen
  const rest: PoolEntry[] = [];

  for (const entry of pool) {
    const rec = records[entry.item.char];
    if (!rec) {
      newChars.push(entry);
    } else if (rec.nextReview <= today) {
      dueForReview.push(entry);
    } else if (rec.wrong >= 3) {
      highError.push(entry);
    } else {
      rest.push(entry);
    }
  }

  // Priority: due > high-error > new > rest
  const prioritized = [
    ...shuffle(dueForReview),
    ...shuffle(highError),
    ...shuffle(newChars),
    ...shuffle(rest),
  ];

  // Deduplicate by char (avoid testing same char twice)
  const seen = new Set<string>();
  const picked: PoolEntry[] = [];
  for (const entry of prioritized) {
    if (seen.has(entry.item.char)) continue;
    seen.add(entry.item.char);
    picked.push(entry);
    if (picked.length >= count) break;
  }

  const questions = picked.map((entry) => {
    // Pick 3 distractors (different chars)
    const sameGroup = chars.filter((c) => c.char !== entry.item.char && c.groupId === entry.item.groupId);
    const otherGroup = chars.filter((c) => c.char !== entry.item.char && c.groupId !== entry.item.groupId);
    const distractors = shuffle([...sameGroup, ...otherGroup]).slice(0, 3);
    return {
      correct: entry.item,
      readingIdx: entry.readingIdx,
      options: shuffle([entry.item, ...distractors]),
    };
  });
  // Ensure same char doesn't appear in consecutive questions
  for (let i = 1; i < questions.length; i++) {
    if (questions[i].correct.char === questions[i - 1].correct.char) {
      // Find a later question with a different char and swap
      for (let j = i + 1; j < questions.length; j++) {
        if (questions[j].correct.char !== questions[i - 1].correct.char) {
          [questions[i], questions[j]] = [questions[j], questions[i]];
          break;
        }
      }
    }
  }
  return questions;
}

/* ─── Group Range Selector ─── */

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

/* ─── Quiz Settings ─── */

function QuizSettings({ onStart, onBack }: { onStart: (groupIds: string[], count: number) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(charGroups.map((g) => g.id)));
  const [count, setCount] = useState(10);

  const maxCount = allChars.filter((c) => selected.has(c.groupId)).length;
  const counts = [5, 10, 15, 20, 30, 50];
  // Auto-adjust count if current selection can't support it
  const effectiveCount = Math.min(count, maxCount);

  return (
    <div className="flex flex-col h-dvh">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">测验设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 max-w-xl mx-auto w-full">
        <h2 className="font-bold text-slate-700 mb-3">选择出题范围</h2>
        <GroupRangeSelector selected={selected} setSelected={setSelected} />

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
          onClick={() => onStart([...selected], effectiveCount)}
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
  const reading = q.correct.readings[q.readingIdx];
  const isPolyphonic = q.correct.readings.length > 1;
  /** What to play: bare char for single-reading, context word for polyphonic */
  const promptText = isPolyphonic ? reading.words[0] : q.correct.char;
  const isCorrect = selected === q.correct.char;
  const answered = selected !== null;

  /** Speak the quiz prompt: try pre-recorded audio first, fallback to browser TTS */
  const speakPrompt = useCallback(() => {
    stopAll();
    if (isPolyphonic) {
      speakReading(q.correct.char, reading);
    } else {
      // Single-reading: try pre-recorded, fallback to browser TTS
      const pre = playPrerecorded(q.correct.char);
      if (!pre) speak(q.correct.char);
    }
  }, [q.correct.char, reading, isPolyphonic]);

  // Auto-speak the prompt when question loads
  useEffect(() => {
    hasSpoken.current = false;
    const timer = setTimeout(() => {
      if (!hasSpoken.current) {
        speakPrompt();
        hasSpoken.current = true;
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [qIdx, speakPrompt]);

  const handleSelect = (char: string) => {
    if (answered) return;
    setSelected(char);
    const correct = char === q.correct.char;
    const answer: QuizAnswer = { question: q, selected: char, isCorrect: correct };
    setAnswers((prev) => [...prev, answer]);

    // Record to localStorage for spaced repetition
    recordAnswer(q.correct.char, correct);

    if (correct) {
      playCorrectSound();
      const r = q.correct.readings[q.readingIdx];
      setTimeout(() => {
        if (q.correct.readings.length > 1) speakReading(q.correct.char, r);
        else speakReading(q.correct.char, r, q.correct.char);
      }, 300);
    } else {
      playWrongSound();
    }
  };

  const handleNext = () => {
    stopAll(); // stop any ongoing speech before advancing
    if (qIdx < questions.length - 1) {
      setSelected(null);
      setQIdx((i) => i + 1);
    } else {
      onFinish(answers);
    }
  };

  // Keyboard: Enter/Space to advance, 1-4 to select options
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (answered && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        handleNext();
      }
      if (!answered && e.key >= "1" && e.key <= "4") {
        const idx = parseInt(e.key) - 1;
        if (idx < q.options.length) handleSelect(q.options[idx].char);
      }
      if (e.key === "r" || e.key === "R") {
        speakPrompt();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <div className="flex flex-col h-dvh">
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

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Scrollable question area */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-4 overflow-y-auto">
          <p className="text-slate-500 font-medium text-sm">听一听，选一选 👂</p>
          <p className="text-[11px] text-slate-400 -mt-2">{isPolyphonic ? "听词语，找出对应的字" : "听发音，找出对应的字"}</p>

          <button
            onClick={() => speakPrompt()}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 active:scale-95 transition-all shrink-0"
          >
            <Volume2 className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
          </button>

          {/* Options 2x2 grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-xs sm:max-w-sm">
            {q.options.map((opt) => {
              const isCorrectOpt = opt.char === q.correct.char;
              const isWrongPick = answered && opt.char === selected && !isCorrectOpt;
              const showDetail = answered && (isCorrectOpt || isWrongPick);
              const optReading = opt.readings[0];

              let style = "bg-white border-slate-200 text-slate-800 hover:border-indigo-300 hover:shadow-md";
              if (answered) {
                if (isCorrectOpt) style = "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200";
                else if (isWrongPick) style = "bg-rose-50 border-rose-400 text-rose-600";
                else style = "bg-slate-50 border-slate-200 text-slate-400";
              }

              const handleClick = () => {
                if (!answered) { handleSelect(opt.char); return; }
                if (showDetail) {
                  speakReading(opt.char, optReading, opt.char);
                }
              };

              return (
                <motion.button
                  key={opt.char}
                  onClick={handleClick}
                  whileTap={answered ? {} : { scale: 0.93 }}
                  className={`border-2 rounded-2xl py-3 sm:py-4 font-bold transition-all flex flex-col items-center gap-0.5 ${style}`}
                >
                  <span className="text-4xl sm:text-5xl">{opt.char}</span>
                  {showDetail && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center mt-1"
                    >
                      <span className={`text-xs font-mono ${isCorrectOpt ? "text-emerald-500" : "text-rose-400"}`}>
                        {optReading.pinyin}
                      </span>
                      <span className={`text-xs font-medium ${isCorrectOpt ? "text-emerald-600" : "text-rose-500"}`}>
                        {optReading.words.join("、")}
                      </span>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Fixed bottom: feedback label + next button */}
        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:py-4 flex flex-col items-center gap-2"
            >
              <div className="w-full max-w-sm text-center">
                {isCorrect ? (
                  <p className="text-emerald-600 font-bold text-sm flex items-center justify-center gap-1.5">
                    <Check className="w-5 h-5" /> 太棒了！
                  </p>
                ) : (
                  <p className="text-rose-500 font-bold text-sm flex items-center justify-center gap-1.5">
                    <XIcon className="w-4 h-4" /> 答错了，点字听读音
                  </p>
                )}
              </div>

              <button
                onClick={handleNext}
                className={`w-full max-w-sm py-3 rounded-xl font-bold text-base active:scale-[0.98] transition-all ${
                  isCorrect
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-indigo-500 text-white hover:bg-indigo-600"
                }`}
              >
                {qIdx < questions.length - 1 ? "下一题 →" : "查看结果"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── 8-bit Victory Celebration Music ─── */

function playVictoryMusic() {
  try {
    const ctx = new AudioContext();
    const bpm = 240;
    const beat = 60 / bpm;

    const playNote = (freq: number, start: number, dur: number, vol = 0.1, type: OscillatorType = "square") => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.02);
    };

    // Short silly fanfare ~1.5s
    const C5=523.25, E5=659.25, G5=783.99, C6=1046.5, E6=1318.5;
    const notes: [number, number, OscillatorType?][] = [
      [C5, 1], [E5, 1], [G5, 1], [C6, 0.5],
      [G5, 0.5], [C6, 0.5], [E6, 2, "sawtooth"],
      // Goofy wobble ending
      [C6, 0.4], [E6, 0.4], [C6, 0.4], [E6, 0.4], [G5, 0.4], [C6, 1.5],
    ];

    let t = 0;
    for (const [freq, dur, type] of notes) {
      playNote(freq, t, dur * beat, 0.09, type || "square");
      t += dur * beat;
    }

    // Silly low "boing" at the end
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, ctx.currentTime + t);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + t + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime + t);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + 0.5);
  } catch {}
}

/* ─── Quiz Results ─── */

function QuizResults({
  answers,
  groupIds,
  onRetry,
  onBack,
}: {
  answers: QuizAnswer[];
  groupIds: string[];
  onRetry: () => void;
  onBack: () => void;
}) {
  const correct = answers.filter((a) => a.isCorrect).length;
  const total = answers.length;
  const pct = Math.round((correct / total) * 100);
  const wrong = answers.filter((a) => !a.isCorrect);

  const [showCard, setShowCard] = useState<CharItem | null>(null);

  // Play victory music on 100%
  useEffect(() => {
    if (pct === 100) {
      const timer = setTimeout(playVictoryMusic, 500);
      return () => clearTimeout(timer);
    }
  }, [pct]);

  return (
    <div className="flex flex-col h-dvh">
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

        {/* Quiz summary - tested range and all chars */}
        <div className="mb-8">
          <h3 className="font-bold text-slate-700 mb-2">测验总结</h3>
          <p className="text-xs text-slate-500 mb-3">
            出题范围：{groupIds.map((id) => charGroups.find((g) => g.id === id)?.name).filter(Boolean).join("、")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {answers.map((a) => {
              const r = a.question.correct.readings[a.question.readingIdx];
              return (
                <button
                  key={a.question.correct.char + a.question.readingIdx}
                  onClick={() => { speakChar(a.question.correct); setShowCard(a.question.correct); }}
                  className={`px-2.5 py-1.5 rounded-lg border text-base font-bold transition-all hover:shadow-sm active:scale-95 ${
                    a.isCorrect
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                  title={`${r.pinyin} ${r.words.join("、")}`}
                >
                  {a.question.correct.char}
                  {a.isCorrect ? <Check className="w-3 h-3 inline ml-0.5 -mt-0.5" /> : <XIcon className="w-3 h-3 inline ml-0.5 -mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

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

/* ─── Listen Quiz (听音选字 3×3) ─── */

interface ListenRoundMistake {
  /** The char that was being asked */
  target: CharItem;
  /** Chars the player incorrectly tapped before getting it right */
  wrongTaps: string[];
}

interface ListenQuizResult {
  /** Total mistakes across all rounds */
  totalMistakes: number;
  /** Details of each mistake */
  mistakes: ListenRoundMistake[];
}

/** Pick 9 random single-reading chars from the given groups */
function generateListenGrid(groupIds: string[]): CharItem[] {
  const pool = allChars.filter((c) => groupIds.includes(c.groupId) && c.readings.length === 1);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 9);
}

function ListenQuizSettings({ onStart, onBack }: { onStart: (groupIds: string[]) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(charGroups.map((g) => g.id)));

  const availableCount = allChars.filter((c) => selected.has(c.groupId) && c.readings.length === 1).length;

  return (
    <div className="flex flex-col h-dvh">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">听音选字设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 max-w-xl mx-auto w-full">
        <h2 className="font-bold text-slate-700 mb-3">选择出题范围</h2>
        <GroupRangeSelector selected={selected} setSelected={setSelected} />

        <p className="text-sm text-slate-500 mb-6">
          每次从所选范围随机出 9 个字，排成 3×3 方阵，听音选字。
          {availableCount > 0 && <span className="text-slate-400"> （可用 {availableCount} 字）</span>}
        </p>

        <button
          disabled={availableCount < 9}
          onClick={() => onStart([...selected])}
          className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-lg hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          开始游戏 🎮
        </button>
        {availableCount < 9 && selected.size > 0 && (
          <p className="text-xs text-rose-500 mt-2 text-center">所选范围需至少 9 个单音字才能出题</p>
        )}
      </div>
    </div>
  );
}

function ListenQuizPlay({
  groupIds,
  onFinish,
  onBack,
}: {
  groupIds: string[];
  onFinish: (result: ListenQuizResult, grid: CharItem[]) => void;
  onBack: () => void;
}) {
  const [grid, setGrid] = useState<CharItem[]>([]);
  const [queue, setQueue] = useState<number[]>([]);     // indices into grid, shuffled order
  const [currentIdx, setCurrentIdx] = useState(0);       // position in queue
  const [solved, setSolved] = useState<Set<number>>(new Set());  // grid indices solved
  const [shaking, setShaking] = useState<number | null>(null);   // grid index currently shaking
  const [mistakes, setMistakes] = useState<ListenRoundMistake[]>([]);
  const [currentWrongTaps, setCurrentWrongTaps] = useState<string[]>([]);
  const hasSpoken = useRef(false);

  // Initialize grid and queue
  useEffect(() => {
    const chars = generateListenGrid(groupIds);
    setGrid(chars);
    const order = chars.map((_, i) => i).sort(() => Math.random() - 0.5);
    setQueue(order);
    setCurrentIdx(0);
    setSolved(new Set());
    setMistakes([]);
    setCurrentWrongTaps([]);
  }, [groupIds]);

  const targetGridIdx = queue[currentIdx];
  const targetChar = grid[targetGridIdx];

  // Play the current target's audio
  const speakTarget = useCallback(() => {
    if (!targetChar) return;
    stopAll();
    const pre = playPrerecorded(targetChar.char);
    if (!pre) speak(targetChar.char);
  }, [targetChar]);

  // Auto-speak when question changes
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
    if (solved.has(gridIdx)) return; // already solved
    if (!targetChar) return;

    if (gridIdx === targetGridIdx) {
      // Correct!
      playCorrectSound();
      const newSolved = new Set(solved);
      newSolved.add(gridIdx);
      setSolved(newSolved);

      // Record mistake if any wrong taps on this char
      if (currentWrongTaps.length > 0) {
        setMistakes((prev) => [...prev, { target: targetChar, wrongTaps: [...currentWrongTaps] }]);
      }
      setCurrentWrongTaps([]);

      // Record to spaced repetition
      recordAnswer(targetChar.char, currentWrongTaps.length === 0);

      // Move to next or finish
      if (newSolved.size === grid.length) {
        // All done
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
      // Wrong!
      playWrongSound();
      setCurrentWrongTaps((prev) => [...prev, grid[gridIdx].char]);
      // Record wrong tap for the tapped char too
      recordAnswer(grid[gridIdx].char, false);
      // Shake animation
      setShaking(gridIdx);
      setTimeout(() => setShaking(null), 500);
    }
  };

  if (grid.length < 9) {
    return (
      <div className="flex flex-col h-dvh items-center justify-center gap-4 px-4">
        <p className="text-slate-500 text-center">所选范围的单音字不足 9 个，请选择更多分组</p>
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

        {/* 3×3 Grid */}
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

function ListenQuizResults({
  result,
  grid,
  groupIds,
  onRetry,
  onBack,
}: {
  result: ListenQuizResult;
  grid: CharItem[];
  groupIds: string[];
  onRetry: () => void;
  onBack: () => void;
}) {
  const perfect = result.totalMistakes === 0;
  const [showCard, setShowCard] = useState<CharItem | null>(null);

  // Play victory music on perfect score
  useEffect(() => {
    if (perfect) {
      const timer = setTimeout(playVictoryMusic, 500);
      return () => clearTimeout(timer);
    }
  }, [perfect]);

  // Collect all unique chars involved in mistakes
  const mistakeChars = new Map<string, { item: CharItem; asTarget: boolean; asWrongTap: boolean }>();
  for (const m of result.mistakes) {
    const key = m.target.char;
    const existing = mistakeChars.get(key);
    if (existing) {
      existing.asTarget = true;
    } else {
      mistakeChars.set(key, { item: m.target, asTarget: true, asWrongTap: false });
    }
    for (const wrongChar of m.wrongTaps) {
      const wrongItem = grid.find((c) => c.char === wrongChar) || allChars.find((c) => c.char === wrongChar);
      if (!wrongItem) continue;
      const ex = mistakeChars.get(wrongChar);
      if (ex) {
        ex.asWrongTap = true;
      } else {
        mistakeChars.set(wrongChar, { item: wrongItem, asTarget: false, asWrongTap: true });
      }
    }
  }

  return (
    <div className="flex flex-col h-dvh">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-lg">听音选字结果</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 max-w-lg mx-auto w-full">
        <div className="text-center mb-8">
          <p className="text-6xl font-bold mb-2">{perfect ? "🎉" : "💪"}</p>
          <p className="text-2xl font-bold text-slate-800">
            {perfect ? "全部正确！太棒了！" : `完成了！错了 ${result.totalMistakes} 次`}
          </p>
          <p className="text-slate-500 mt-1">
            {perfect ? "一次都没选错，真厉害！" : "下面是需要复习的字"}
          </p>
        </div>

        {/* Mistake review */}
        {!perfect && (
          <div className="mb-8 space-y-3">
            <h2 className="font-bold text-slate-700">需要复习的字</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[...mistakeChars.values()].map(({ item, asTarget, asWrongTap }) => {
                const r = item.readings[0];
                return (
                  <button
                    key={item.char}
                    onClick={() => speakChar(item)}
                    className={`rounded-xl border-2 p-3 flex flex-col items-center gap-1 transition-all hover:shadow-md active:scale-95 ${
                      asTarget && asWrongTap
                        ? "border-orange-300 bg-orange-50"
                        : asTarget
                        ? "border-rose-300 bg-rose-50"
                        : "border-amber-300 bg-amber-50"
                    }`}
                  >
                    <span className="text-2xl font-bold">{item.char}</span>
                    {r && (
                      <>
                        <span className="text-xs text-slate-500 font-mono">{r.pinyin}</span>
                        <span className="text-xs text-slate-600">{r.words.join("、")}</span>
                      </>
                    )}
                    <span className="text-[10px] mt-0.5 text-slate-400">
                      {asTarget && asWrongTap ? "没选对 & 被误选" : asTarget ? "没选对" : "被误选"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Card modal */}
        <AnimatePresence>
          {showCard && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
              onClick={() => setShowCard(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
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

        {/* Quiz summary */}
        <div className="mb-8">
          <h3 className="font-bold text-slate-700 mb-2">测验总结</h3>
          <p className="text-xs text-slate-500 mb-3">
            出题范围：{groupIds.map((id) => charGroups.find((g) => g.id === id)?.name).filter(Boolean).join("、")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {grid.map((item) => {
              const hasMistake = result.mistakes.some((m) => m.target.char === item.char || m.wrongTaps.includes(item.char));
              return (
                <button
                  key={item.char}
                  onClick={() => speakChar(item)}
                  className={`px-2.5 py-1.5 rounded-lg border text-base font-bold transition-all hover:shadow-sm active:scale-95 ${
                    hasMistake
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                  title={item.readings[0]?.pinyin + " " + item.readings[0]?.words.join("、")}
                >
                  {item.char}
                  {hasMistake ? <XIcon className="w-3 h-3 inline ml-0.5 -mt-0.5" /> : <Check className="w-3 h-3 inline ml-0.5 -mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

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

type Mode = "home" | "learn" | "quiz-settings" | "quiz-play" | "quiz-results" | "listen-quiz-settings" | "listen-quiz-play" | "listen-quiz-results";

export default function ChineseLiteracyPage() {
  const [mode, setMode] = useState<Mode>("home");
  const [isClient, setIsClient] = useState(false);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [quizRound, setQuizRound] = useState(0);
  const [lastQuizConfig, setLastQuizConfig] = useState<{ groupIds: string[]; count: number } | null>(null);

  // Listen quiz state
  const [listenGroupIds, setListenGroupIds] = useState<string[]>([]);
  const [listenResult, setListenResult] = useState<ListenQuizResult | null>(null);
  const [listenGrid, setListenGrid] = useState<CharItem[]>([]);
  const [listenRound, setListenRound] = useState(0);

  useEffect(() => setIsClient(true), []);
  useVoiceInit();

  const startQuiz = useCallback((groupIds: string[], count: number) => {
    const questions = generateQuiz(groupIds, count);
    setQuizQuestions(questions);
    setQuizAnswers([]);
    setQuizRound((r) => r + 1);
    setLastQuizConfig({ groupIds, count });
    setMode("quiz-play");
  }, []);

  const retryQuiz = useCallback(() => {
    if (lastQuizConfig) startQuiz(lastQuizConfig.groupIds, lastQuizConfig.count);
  }, [lastQuizConfig, startQuiz]);

  const startListenQuiz = useCallback((groupIds: string[]) => {
    setListenGroupIds(groupIds);
    setListenResult(null);
    setListenRound((r) => r + 1);
    setMode("listen-quiz-play");
  }, []);

  const retryListenQuiz = useCallback(() => {
    if (listenGroupIds.length > 0) startListenQuiz(listenGroupIds);
  }, [listenGroupIds, startListenQuiz]);

  if (!isClient) {
    return <div className="h-screen bg-slate-50 flex items-center justify-center text-slate-400">加载中...</div>;
  }

  if (mode === "learn") return <LearnMode onBack={() => setMode("home")} />;
  if (mode === "quiz-settings") return <QuizSettings onStart={startQuiz} onBack={() => setMode("home")} />;
  if (mode === "listen-quiz-settings") return <ListenQuizSettings onStart={startListenQuiz} onBack={() => setMode("home")} />;
  if (mode === "quiz-play")
    return (
      <QuizPlay
        questions={quizQuestions}
        onFinish={(a) => { setQuizAnswers(a); setMode("quiz-results"); }}
        onBack={() => setMode("home")}
      />
    );
  if (mode === "quiz-results")
    return <QuizResults key={quizRound} answers={quizAnswers} groupIds={lastQuizConfig?.groupIds ?? []} onRetry={retryQuiz} onBack={() => setMode("home")} />;
  if (mode === "listen-quiz-play")
    return (
      <ListenQuizPlay
        key={listenRound}
        groupIds={listenGroupIds}
        onFinish={(r, g) => { setListenResult(r); setListenGrid(g); setMode("listen-quiz-results"); }}
        onBack={() => setMode("home")}
      />
    );
  if (mode === "listen-quiz-results" && listenResult)
    return <ListenQuizResults key={listenRound} result={listenResult} grid={listenGrid} groupIds={listenGroupIds} onRetry={retryListenQuiz} onBack={() => setMode("home")} />;

  // Home
  const progress = isClient ? loadProgress() : new Set<string>();
  const progressPct = Math.round((progress.size / allChars.length) * 100);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="text-center mb-10">
        <p className="text-6xl mb-4">📖</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight">中文识字</h1>
        <p className="text-slate-500 mt-2 text-sm sm:text-base">
          {allChars.length} 个常用字 · {charGroups.length} 个分组
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
      </div>

      <a href="/" className="mt-10 text-sm text-slate-400 hover:text-slate-600 transition-colors">
        ← 返回工具箱
      </a>
    </div>
  );
}
