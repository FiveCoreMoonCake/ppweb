"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  X as XIcon,
} from "lucide-react";
import Link from "next/link";

/* ─── Types ─── */
interface WordBoundary {
  w: string;
  s: number;
  e: number;
}

interface VocabItem {
  word: string;
  pinyin: string;
  meaning: string;
}

interface BookPage {
  textPosition?: "top" | "center" | "bottom";
  text: string;
  subtitle?: string;
  image?: string;
  audio: string;
  words: WordBoundary[];
  emoji?: string;
  bg?: string;
  vocab?: VocabItem[];
}

interface Book {
  id: string;
  title: string;
  author: string;
  ageRange: string;
  pages: BookPage[];
}

/* ─── Book list ─── */
const BOOKS = [
  { id: "rabbit-carrot", title: "小白兔找萝卜", emoji: "🐰🥕", ageRange: "3-6" },
];

/* ─── Vocab Popup ─── */
function VocabPopup({
  vocab,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  vocab: VocabItem;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      // Read word first, then explanation
      const u = new SpeechSynthesisUtterance(`${vocab.word}，，${vocab.meaning}`);
      u.lang = "zh-CN";
      u.rate = 0.7;
      window.speechSynthesis.speak(u);
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute z-30 bg-white rounded-xl shadow-xl border border-amber-200 px-4 py-3 min-w-[180px] -translate-x-1/2 left-1/2 top-full mt-2"
    >
      <button onClick={onClose} className="absolute top-1.5 right-1.5 text-slate-400 hover:text-slate-600">
        <XIcon className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg font-bold text-amber-700">{vocab.word}</span>
        <span className="text-xs text-slate-400 font-mono">{vocab.pinyin}</span>
        <button onClick={speak} className="p-1 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200">
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-sm text-slate-600">{vocab.meaning}</p>
    </motion.div>
  );
}

/* ─── Rich Text with highlighting and vocab ─── */
function RichText({
  text,
  words,
  activeIdx,
  isPlaying,
  vocab,
}: {
  text: string;
  words: WordBoundary[];
  activeIdx: number;
  isPlaying: boolean;
  vocab?: VocabItem[];
}) {
  const [activeVocab, setActiveVocab] = useState<VocabItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build vocab lookup set
  const vocabMap = new Map<string, VocabItem>();
  vocab?.forEach((v) => vocabMap.set(v.word, v));

  const showPopup = (v: VocabItem) => {
    if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
    setActiveVocab(v);
  };
  const scheduleClose = () => {
    hoverTimeoutRef.current = setTimeout(() => setActiveVocab(null), 300);
  };
  const cancelClose = () => {
    if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
  };

  const handleVocabClick = (v: VocabItem, e: React.MouseEvent) => {
    e.stopPropagation();
    showPopup(v);
  };

  // If playing and have word boundaries, show highlighted text
  if (isPlaying && words.length > 0) {
    return (
      <div ref={containerRef} className="relative" onClick={() => setActiveVocab(null)}>
        <span className="leading-[2] text-lg sm:text-xl">
          {words.map((wb, i) => {
            const matchedVocab = vocabMap.get(wb.w.replace(/[，。！？、""]/g, ""));
            const isActive = i === activeIdx;
            const isPast = i < activeIdx;
            return (
              <span
                key={i}
                onClick={matchedVocab ? (e) => handleVocabClick(matchedVocab, e) : undefined}
                onMouseEnter={matchedVocab ? () => showPopup(matchedVocab) : undefined}
                onMouseLeave={matchedVocab ? scheduleClose : undefined}
                className={`transition-colors duration-150 relative ${
                  isActive
                    ? "text-amber-600 bg-amber-100 rounded px-0.5 font-medium"
                    : isPast
                      ? "text-slate-700"
                      : "text-slate-400"
                } ${matchedVocab ? "underline decoration-violet-400 decoration-2 underline-offset-4 cursor-pointer" : ""}`}
              >
                {wb.w}
                {activeVocab === matchedVocab && (
                  <AnimatePresence>
                    <VocabPopup vocab={activeVocab} onClose={() => setActiveVocab(null)} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} />
                  </AnimatePresence>
                )}
              </span>
            );
          })}
        </span>
      </div>
    );
  }

  // Static text: mark vocab words with special styling
  if (!vocab || vocab.length === 0) {
    return <span className="leading-[2] text-lg sm:text-xl text-slate-700">{text}</span>;
  }

  // Split text around vocab words for highlighting
  const parts: { text: string; vocab?: VocabItem }[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    let earliest = -1;
    let earliestVocab: VocabItem | null = null;
    for (const v of vocab) {
      const idx = remaining.indexOf(v.word);
      if (idx !== -1 && (earliest === -1 || idx < earliest)) {
        earliest = idx;
        earliestVocab = v;
      }
    }
    if (earliest === -1 || !earliestVocab) {
      parts.push({ text: remaining });
      break;
    }
    if (earliest > 0) parts.push({ text: remaining.slice(0, earliest) });
    parts.push({ text: earliestVocab.word, vocab: earliestVocab });
    remaining = remaining.slice(earliest + earliestVocab.word.length);
  }

  return (
    <div ref={containerRef} className="relative" onClick={() => setActiveVocab(null)}>
      <span className="leading-[2] text-lg sm:text-xl text-slate-700">
        {parts.map((p, i) =>
          p.vocab ? (
            <span
              key={i}
              onClick={(e) => handleVocabClick(p.vocab!, e)}
              onMouseEnter={() => showPopup(p.vocab!)}
              onMouseLeave={scheduleClose}
              className="text-violet-600 font-medium underline decoration-violet-300 decoration-2 underline-offset-4 cursor-pointer hover:bg-violet-50 rounded px-0.5 relative"
            >
              {p.text}
              {activeVocab === p.vocab && (
                <AnimatePresence>
                  <VocabPopup vocab={activeVocab} onClose={() => setActiveVocab(null)} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} />
                </AnimatePresence>
              )}
            </span>
          ) : (
            <span key={i}>{p.text}</span>
          )
        )}
      </span>
    </div>
  );
}

/* ─── Page View — full-image with text overlay ─── */
function PageView({
  page,
  pageNum,
  totalPages,
  isPlaying,
  activeWordIdx,
}: {
  page: BookPage;
  pageNum: number;
  totalPages: number;
  isPlaying: boolean;
  activeWordIdx: number;
}) {
  const pos = page.textPosition || "bottom";
  const posClass =
    pos === "top"
      ? "justify-start pt-6"
      : pos === "center"
        ? "justify-center"
        : "justify-end pb-6";

  return (
    <div className="flex flex-col h-full">
      <div
        className={`flex-1 flex flex-col ${posClass} items-center bg-gradient-to-br ${page.bg || "from-slate-100 to-slate-200"} rounded-2xl px-4 py-6 sm:px-6 sm:py-8 relative overflow-hidden`}
      >
        {/* Emoji / image in background */}
        {page.emoji && (
          <span className="absolute inset-0 flex items-center justify-center text-7xl sm:text-9xl select-none opacity-80 pointer-events-none">
            {page.emoji}
          </span>
        )}
        {/* Text overlay */}
        <div className="relative z-10 bg-white/85 backdrop-blur-sm rounded-xl px-5 py-4 sm:px-8 sm:py-5 max-w-lg w-full shadow-sm">
          <RichText
            text={page.text}
            words={page.words}
            activeIdx={activeWordIdx}
            isPlaying={isPlaying}
            vocab={page.vocab}
          />
          {page.subtitle && (
            <p className="text-center text-sm text-slate-400 mt-2">{page.subtitle}</p>
          )}
        </div>
        <span className="absolute bottom-2 right-3 text-xs text-white/50 font-mono">
          {pageNum}/{totalPages}
        </span>
      </div>
    </div>
  );
}

/* ─── Book Reader ─── */
function BookReader({
  book,
  onBack,
}: {
  book: Book;
  onBack: () => void;
}) {
  const [pageIdx, setPageIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [autoPlay, setAutoPlay] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const page = book.pages[pageIdx];
  const hasNext = pageIdx < book.pages.length - 1;
  const hasPrev = pageIdx > 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  // Stop and destroy audio entirely
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setActiveWordIdx(-1);
  }, []);

  // Start word-tracking RAF loop
  const startTick = useCallback((words: WordBoundary[]) => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    const tick = () => {
      if (!audioRef.current) return;
      const ms = audioRef.current.currentTime * 1000;
      let idx = -1;
      for (let i = 0; i < words.length; i++) {
        if (ms >= words[i].s && ms < words[i].e) { idx = i; break; }
      }
      if (idx === -1 && words.length > 0 && ms >= words[words.length - 1].s) {
        idx = words.length - 1;
      }
      setActiveWordIdx(idx);
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
  }, []);

  const playPage = useCallback(() => {
    stopAudio();

    const audio = new Audio(page.audio);
    audioRef.current = audio;
    setIsPlaying(true);

    audio.onplay = () => startTick(page.words);
    audio.onended = () => {
      setIsPlaying(false);
      setActiveWordIdx(-1);
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      if (autoPlay && hasNext) {
        setTimeout(() => setPageIdx((i) => i + 1), 800);
      }
    };

    audio.play().catch(() => setIsPlaying(false));
  }, [page, stopAudio, startTick, autoPlay, hasNext]);

  // Pause: keep audio alive, stop tracking
  const pauseAudio = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    if (timerRef.current) { cancelAnimationFrame(timerRef.current); timerRef.current = null; }
    setIsPlaying(false);
  }, []);

  // Resume: play existing audio, restart tracking
  const resumeAudio = useCallback(() => {
    if (!audioRef.current) { playPage(); return; }
    setIsPlaying(true);
    startTick(page.words);
    audioRef.current.play().catch(() => setIsPlaying(false));
  }, [page, playPage, startTick]);

  // Auto-play when page changes during autoPlay
  useEffect(() => {
    if (autoPlay) {
      const t = setTimeout(playPage, 500);
      return () => clearTimeout(t);
    }
  }, [pageIdx, autoPlay, playPage]);

  const goPage = (dir: number) => {
    stopAudio();
    setAutoPlay(false);
    setPageIdx((i) => Math.max(0, Math.min(book.pages.length - 1, i + dir)));
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseAudio();
      setAutoPlay(false);
    } else if (audioRef.current) {
      resumeAudio();
    } else {
      playPage();
    }
  };

  const startAutoPlay = () => {
    stopAudio();
    setAutoPlay(true);
    setPageIdx(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) goPage(-1);
      if (e.key === "ArrowRight" && hasNext) goPage(1);
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Touch swipe
  const touchStart = useRef<number | null>(null);

  return (
    <div className="flex flex-col h-dvh bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-amber-200/50">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-700 p-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-slate-700 truncate mx-2">
          {book.title}
        </h1>
        <button
          onClick={startAutoPlay}
          className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200 font-medium transition-colors"
        >
          {autoPlay ? "自动播放中…" : "自动播放"}
        </button>
      </header>

      {/* Book content */}
      <div
        className="flex-1 flex flex-col px-3 py-3 sm:px-6 sm:py-4 overflow-hidden"
        onTouchStart={(e) => {
          touchStart.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStart.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStart.current;
          touchStart.current = null;
          if (Math.abs(dx) > 60) {
            if (dx < 0 && hasNext) goPage(1);
            if (dx > 0 && hasPrev) goPage(-1);
          }
        }}
      >
        <div className="flex-1 max-w-2xl w-full mx-auto flex flex-col rounded-2xl shadow-lg overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pageIdx}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col"
            >
              <PageView
                page={page}
                pageNum={pageIdx + 1}
                totalPages={book.pages.length}
                isPlaying={isPlaying}
                activeWordIdx={activeWordIdx}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="shrink-0 px-4 py-3 sm:py-4 bg-white/80 backdrop-blur-sm border-t border-amber-200/50">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => goPage(-1)}
            disabled={!hasPrev}
            className="p-3 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 active:scale-95 transition-all shadow-lg"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </button>
            <button
              onClick={() => {
                stopAudio();
                setAutoPlay(false);
                setPageIdx(0);
              }}
              className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => goPage(1)}
            disabled={!hasNext}
            className="p-3 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Page dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {book.pages.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                stopAudio();
                setAutoPlay(false);
                setPageIdx(i);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === pageIdx
                  ? "bg-amber-500 w-4"
                  : "bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Book Shelf (list of books) ─── */
function BookShelf({ onSelect }: { onSelect: (bookId: string) => void }) {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-amber-50 to-orange-50">
      <header className="border-b border-amber-200/50 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-slate-500 hover:text-slate-700 p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">绘本馆 📚</h1>
            <p className="text-xs text-slate-500">点一本，听一听</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {BOOKS.map((b) => (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              className="bg-white rounded-2xl shadow-md hover:shadow-lg p-5 flex flex-col items-center gap-3 transition-all active:scale-[0.97] border border-amber-100"
            >
              <span className="text-5xl">{b.emoji}</span>
              <span className="font-bold text-slate-700 text-sm">
                {b.title}
              </span>
              <span className="text-[10px] text-slate-400">
                适合 {b.ageRange} 岁
              </span>
            </button>
          ))}

          {/* Placeholder for future books */}
          <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-5 flex flex-col items-center justify-center gap-2 opacity-50">
            <span className="text-3xl">📝</span>
            <span className="text-xs text-slate-400">更多绘本制作中…</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function PictureBookPage() {
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBook = async (bookId: string) => {
    setLoading(true);
    setSelectedBook(bookId);
    try {
      const res = await fetch(`/books/${bookId}/book.json`);
      const data = await res.json();
      setBook(data);
    } catch (e) {
      console.error("Failed to load book:", e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-amber-50">
        <div className="text-center">
          <span className="text-4xl animate-bounce inline-block">📖</span>
          <p className="text-slate-500 mt-3 text-sm">正在翻开绘本…</p>
        </div>
      </div>
    );
  }

  if (selectedBook && book) {
    return (
      <BookReader
        book={book}
        onBack={() => {
          setSelectedBook(null);
          setBook(null);
        }}
      />
    );
  }

  return <BookShelf onSelect={loadBook} />;
}
