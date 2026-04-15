"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RequireAuth } from "@/lib/require-auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Volume2,
  BookOpen,
  PlayCircle,
  StopCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

/* ─── Types ─── */
interface WordBoundary { w: string; s: number; e: number }

interface VocabItem { word: string; pinyin: string; meaning: string }

interface BookPage {
  text: string;
  subtitle?: string;
  image?: string;
  layout?: "image-top" | "image-full" | "text-only" | "vocab-summary";
  audio: string;
  words: WordBoundary[];
  emoji?: string;
  bg?: string;
  textPosition?: "top" | "center" | "bottom";
  vocab?: VocabItem[];
}

interface Book {
  id: string;
  title: string;
  author: string;
  ageRange: string;
  cover?: string;
  pages: BookPage[];
}

/* ─── Book list ─── */
const BOOKS = [
  {
    id: "rabbit-carrot",
    title: "小白兔找萝卜",
    emoji: "🐰🥕",
    ageRange: "3-6",
    cover: "/books/rabbit-carrot/cover.svg",
    pageCount: 10,
  },
];

/* ─── Highlighted text (used during tap-to-read playback) ─── */
function HighlightedText({
  words,
  activeIdx,
  isPlaying,
  text,
}: {
  words: WordBoundary[];
  activeIdx: number;
  isPlaying: boolean;
  text: string;
}) {
  if (isPlaying && words.length > 0) {
    return (
      <span className="leading-[2] text-base sm:text-lg md:text-xl">
        {words.map((wb, i) => {
          const isActive = i === activeIdx;
          const isPast = i < activeIdx;
          return (
            <span
              key={i}
              className={`transition-colors duration-150 ${
                isActive
                  ? "text-amber-600 bg-amber-100/90 rounded px-0.5 font-bold"
                  : isPast
                    ? "text-slate-800"
                    : "text-slate-400"
              }`}
            >
              {wb.w}
            </span>
          );
        })}
      </span>
    );
  }
  return <span className="leading-[2] text-base sm:text-lg md:text-xl text-slate-800">{text}</span>;
}

/* ─── Single page panel (used in both spread and single-page modes) ─── */
function PagePanel({
  page,
  pageIdx,
  playingPageIdx,
  activeWordIdx,
  onTapText,
}: {
  page: BookPage;
  pageIdx: number;
  playingPageIdx: number | null;
  activeWordIdx: number;
  onTapText: (pageIdx: number) => void;
}) {
  const isPlaying = playingPageIdx === pageIdx;
  const hasImage = !!page.image;
  const pos = page.textPosition || "bottom";
  const posClass =
    pos === "top" ? "items-start pt-4" :
    pos === "center" ? "items-center" :
    "items-end pb-4";

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Background image */}
      {hasImage && (
        <Image
          src={page.image!}
          alt=""
          fill
          className="object-cover"
          sizes="50vw"
          unoptimized={page.image!.endsWith(".svg")}
        />
      )}
      {/* Fallback: emoji + gradient */}
      {!hasImage && (
        <div className={`absolute inset-0 bg-gradient-to-br ${page.bg || "from-slate-100 to-slate-200"}`}>
          {page.emoji && (
            <span className="absolute inset-0 flex items-center justify-center text-6xl sm:text-8xl select-none opacity-80 pointer-events-none">
              {page.emoji}
            </span>
          )}
        </div>
      )}

      {/* Text overlay — clickable for tap-to-read */}
      <div className={`absolute inset-0 flex flex-col ${posClass} justify-end p-3 sm:p-4`}>
        <div
          onClick={() => onTapText(pageIdx)}
          className={`bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 max-w-full shadow-sm cursor-pointer transition-all hover:bg-white/90 ${
            isPlaying ? "ring-2 ring-amber-400 bg-white/90" : ""
          }`}
        >
          <HighlightedText
            words={page.words}
            activeIdx={activeWordIdx}
            isPlaying={isPlaying}
            text={page.text}
          />
          {page.subtitle && (
            <p className="text-center text-xs sm:text-sm text-slate-400 mt-1.5">{page.subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Vocab Summary Page ─── */
function VocabSummaryPanel({ page }: { page: BookPage }) {
  const speak = (word: string, meaning: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(`${word}，，${meaning}`);
      u.lang = "zh-CN";
      u.rate = 0.7;
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className={`w-full h-full overflow-y-auto bg-gradient-to-br ${page.bg || "from-amber-50 to-orange-50"} p-4 sm:p-6`}>
      <h2 className="text-xl font-bold text-slate-700 text-center mb-1">{page.text}</h2>
      {page.subtitle && <p className="text-sm text-slate-400 text-center mb-4">{page.subtitle}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {page.vocab?.map((v, i) => (
          <div
            key={i}
            className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2.5 flex items-center gap-3 shadow-sm"
          >
            <span className="text-lg font-bold text-amber-700 shrink-0">{v.word}</span>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-slate-400 font-mono">{v.pinyin}</span>
              <p className="text-xs text-slate-600 truncate">{v.meaning}</p>
            </div>
            <button
              onClick={() => speak(v.word, v.meaning)}
              className="p-1.5 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 shrink-0"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Book Reader ─── */
function BookReader({ book, onBack }: { book: Book; onBack: () => void }) {
  // Filter out vocab-summary for content pages, keep it separate
  const contentPages = book.pages.filter(p => p.layout !== "vocab-summary");
  const vocabPage = book.pages.find(p => p.layout === "vocab-summary");
  const totalContentPages = contentPages.length;

  // Spread = pair of pages. For spread view, we step by 2.
  // spreadIdx is the index of the LEFT page in the spread.
  const [spreadIdx, setSpreadIdx] = useState(0);
  const [showVocab, setShowVocab] = useState(false);
  const [playingPageIdx, setPlayingPageIdx] = useState<number | null>(null);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [autoPlay, setAutoPlay] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const autoPlayRef = useRef(false);

  // Sync autoPlayRef
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);

  // Responsive check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (timerRef.current) { cancelAnimationFrame(timerRef.current); timerRef.current = null; }
    setPlayingPageIdx(null);
    setActiveWordIdx(-1);
  }, []);

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

  // Play a specific page
  const playPage = useCallback((pageIdx: number) => {
    stopAudio();
    const page = contentPages[pageIdx];
    if (!page || !page.audio) return;

    const audio = new Audio(page.audio);
    audioRef.current = audio;
    setPlayingPageIdx(pageIdx);

    audio.onplay = () => startTick(page.words);
    audio.onended = () => {
      setPlayingPageIdx(null);
      setActiveWordIdx(-1);
      if (timerRef.current) cancelAnimationFrame(timerRef.current);

      // Auto-play: advance to next page
      if (autoPlayRef.current) {
        const nextIdx = pageIdx + 1;
        if (nextIdx < totalContentPages) {
          // If we need to flip to next spread (desktop)
          setTimeout(() => {
            if (!autoPlayRef.current) return;
            // Check if nextIdx is on current spread or needs flip
            const currentSpreadStart = isMobile ? nextIdx : Math.floor(nextIdx / 2) * 2;
            setSpreadIdx(currentSpreadStart);
            setTimeout(() => {
              if (autoPlayRef.current) playPage(nextIdx);
            }, 600);
          }, 400);
        } else {
          setAutoPlay(false);
        }
      }
    };

    audio.play().catch(() => { setPlayingPageIdx(null); });
  }, [contentPages, totalContentPages, stopAudio, startTick, isMobile]);

  // Tap text handler
  const handleTapText = useCallback((pageIdx: number) => {
    if (autoPlay) {
      // Tapping during auto-play exits auto-play
      setAutoPlay(false);
      stopAudio();
      return;
    }
    if (playingPageIdx === pageIdx) {
      // Tapping the same page stops playback
      stopAudio();
    } else {
      playPage(pageIdx);
    }
  }, [playingPageIdx, autoPlay, stopAudio, playPage]);

  // Navigation
  const step = isMobile ? 1 : 2;
  const maxSpreadIdx = isMobile ? totalContentPages - 1 : Math.max(0, totalContentPages - 2 + (totalContentPages % 2));
  const hasPrev = spreadIdx > 0;

  const goNext = useCallback(() => {
    stopAudio();
    setAutoPlay(false);
    if (showVocab) return;
    const nextIdx = spreadIdx + step;
    if (nextIdx >= totalContentPages) {
      if (vocabPage) setShowVocab(true);
    } else {
      setSpreadIdx(Math.min(nextIdx, maxSpreadIdx));
    }
  }, [spreadIdx, step, totalContentPages, maxSpreadIdx, showVocab, vocabPage, stopAudio]);

  const goPrev = useCallback(() => {
    stopAudio();
    setAutoPlay(false);
    if (showVocab) {
      setShowVocab(false);
      return;
    }
    setSpreadIdx(Math.max(0, spreadIdx - step));
  }, [spreadIdx, step, showVocab, stopAudio]);

  // Auto-play
  const startAutoPlay = useCallback(() => {
    stopAudio();
    setShowVocab(false);
    setSpreadIdx(0);
    setAutoPlay(true);
    setTimeout(() => playPage(0), 500);
  }, [stopAudio, playPage]);

  const stopAutoPlay = useCallback(() => {
    setAutoPlay(false);
    stopAudio();
  }, [stopAudio]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  // Touch swipe
  const touchStart = useRef<number | null>(null);

  // Current visible pages
  const leftPage = contentPages[spreadIdx];
  const rightPage = !isMobile && spreadIdx + 1 < totalContentPages ? contentPages[spreadIdx + 1] : null;

  // Total spreads for dot indicator
  const totalSpreads = isMobile ? totalContentPages : Math.ceil(totalContentPages / 2);
  const currentSpreadNum = isMobile ? spreadIdx : Math.floor(spreadIdx / 2);

  return (
    <div className="flex flex-col h-dvh bg-amber-900/10">
      {/* Header */}
      <header className="shrink-0 px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between bg-white/90 backdrop-blur-sm border-b border-amber-200/50">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm sm:text-base font-bold text-slate-700 truncate mx-2">{book.title}</h1>
        <button
          onClick={autoPlay ? stopAutoPlay : startAutoPlay}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            autoPlay
              ? "bg-amber-500 text-white"
              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
          }`}
        >
          {autoPlay ? <StopCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
          {autoPlay ? "停止" : "自动播放"}
        </button>
      </header>

      {/* Book content */}
      <div
        className="flex-1 flex items-center justify-center px-2 py-2 sm:px-6 sm:py-4 overflow-hidden"
        onTouchStart={(e) => { touchStart.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStart.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStart.current;
          touchStart.current = null;
          if (Math.abs(dx) > 60) {
            if (dx < 0) goNext();
            if (dx > 0) goPrev();
          }
        }}
      >
        {/* Book frame */}
        <div className="relative w-full max-w-5xl h-full max-h-[80vh] flex">
          {/* Left arrow */}
          <button
            onClick={goPrev}
            disabled={!hasPrev && !showVocab}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-20 p-2 rounded-full bg-white/80 shadow-md text-slate-500 hover:text-slate-700 hover:bg-white disabled:opacity-0 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Book spread */}
          <AnimatePresence mode="wait">
            <motion.div
              key={showVocab ? "vocab" : `spread-${spreadIdx}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex rounded-xl sm:rounded-2xl overflow-hidden shadow-xl bg-amber-50 border border-amber-200/60"
            >
              {showVocab && vocabPage ? (
                <VocabSummaryPanel page={vocabPage} />
              ) : (
                <>
                  {/* Left page */}
                  <div className={`${isMobile ? "w-full" : "w-1/2 border-r border-amber-200/40"} h-full`}>
                    {leftPage && (
                      <PagePanel
                        page={leftPage}
                        pageIdx={spreadIdx}
                        playingPageIdx={playingPageIdx}
                        activeWordIdx={activeWordIdx}
                        onTapText={handleTapText}
                      />
                    )}
                  </div>
                  {/* Right page (desktop only) */}
                  {!isMobile && (
                    <div className="w-1/2 h-full">
                      {rightPage ? (
                        <PagePanel
                          page={rightPage}
                          pageIdx={spreadIdx + 1}
                          playingPageIdx={playingPageIdx}
                          activeWordIdx={activeWordIdx}
                          onTapText={handleTapText}
                        />
                      ) : (
                        <div className="w-full h-full bg-amber-50/50 flex items-center justify-center">
                          <span className="text-slate-300 text-sm">— 本页留白 —</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Right arrow */}
          <button
            onClick={goNext}
            disabled={showVocab}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-20 p-2 rounded-full bg-white/80 shadow-md text-slate-500 hover:text-slate-700 hover:bg-white disabled:opacity-0 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Page dots */}
      <div className="shrink-0 flex justify-center gap-1.5 py-2 sm:py-3">
        {Array.from({ length: totalSpreads }).map((_, i) => (
          <button
            key={i}
            onClick={() => {
              stopAudio();
              setAutoPlay(false);
              setShowVocab(false);
              setSpreadIdx(isMobile ? i : i * 2);
            }}
            className={`h-1.5 rounded-full transition-all ${
              !showVocab && i === currentSpreadNum
                ? "bg-amber-500 w-5"
                : "bg-slate-300 hover:bg-slate-400 w-1.5"
            }`}
          />
        ))}
        {/* Vocab dot */}
        {vocabPage && (
          <button
            onClick={() => { stopAudio(); setAutoPlay(false); setShowVocab(true); }}
            className={`h-1.5 rounded-full transition-all ${
              showVocab ? "bg-violet-500 w-5" : "bg-violet-200 hover:bg-violet-300 w-1.5"
            }`}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Book Shelf ─── */
function BookShelf({ onSelect }: { onSelect: (bookId: string) => void }) {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-amber-50 to-orange-50">
      <header className="border-b border-amber-200/50 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-slate-500 hover:text-slate-700 p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">绘本馆</h1>
              <p className="text-xs text-slate-500">点一本，听一听</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {BOOKS.map((b) => (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl p-0 flex flex-col items-stretch transition-all active:scale-[0.97] border border-amber-100 overflow-hidden group"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50">
                {b.cover ? (
                  <Image
                    src={b.cover}
                    alt={b.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, 33vw"
                    unoptimized={b.cover.endsWith(".svg")}
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-5xl select-none">
                    {b.emoji}
                  </span>
                )}
              </div>
              <div className="px-3 py-3 text-left">
                <p className="font-bold text-slate-700 text-sm truncate">{b.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">
                    {b.ageRange} 岁
                  </span>
                  <span className="text-[10px] text-slate-400">{b.pageCount} 页</span>
                </div>
              </div>
            </button>
          ))}
          <div className="bg-white/50 rounded-2xl border-2 border-dashed border-amber-200 flex flex-col items-center justify-center gap-3 opacity-60 aspect-[3/5]">
            <span className="text-4xl">✨</span>
            <span className="text-xs text-slate-500 font-medium">更多绘本制作中…</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function PictureBookPage() {
  return (
    <RequireAuth>
      <PictureBooksInner />
    </RequireAuth>
  );
}

function PictureBooksInner() {
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
    return <BookReader book={book} onBack={() => { setSelectedBook(null); setBook(null); }} />;
  }

  return <BookShelf onSelect={loadBook} />;
}
