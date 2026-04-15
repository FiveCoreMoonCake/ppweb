"use client";

import { useEffect } from "react";
import type { CharItem } from "@/data/characters";

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
 * Play pre-recorded audio. Lookup order:
 *   1. "char-pinyin" (polyphonic reading)
 *   2. "char" (single-reading)
 * Returns a Promise that resolves when done, or null if not found.
 */
export function playPrerecorded(char: string, pinyin?: string): Promise<void> | null {
  if (!_manifest) return null;
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
export function stopAll() {
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
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.78;
  return u;
}

export function speak(text: string) {
  stopAll();
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
 */
export async function speakChar(item: CharItem) {
  stopAll();
  const myId = _abortId;

  if (item.readings.length === 1) {
    const r = item.readings[0];
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
  if (item.explain) {
    if (myId !== _abortId) return;
    await wait(400, myId);
    if (myId !== _abortId) return;
    const explainPre = playPrerecorded(`${item.char}_explain`);
    if (explainPre) await explainPre;
    else await speakAndWait(item.explain, myId);
  }
}

/** Play a reading via pre-recorded audio, falling back to browser TTS */
export function speakReading(char: string, reading: { pinyin: string; words: string[] }, fallbackPrefix?: string) {
  stopAll();
  const pre = playPrerecorded(char, reading.pinyin);
  if (pre) return;
  const text = fallbackPrefix ? `${fallbackPrefix}，，${reading.words.join("，，")}` : reading.words.join("，，");
  setTimeout(() => {
    const u = makeUtterance(text);
    if (!u) return;
    window.speechSynthesis.speak(u);
  }, 100);
}

/** Warm up voice list and load audio manifest */
export function useVoiceInit() {
  useEffect(() => {
    loadManifest();
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    getBestChineseVoice();
    const handler = () => { _voiceResolved = false; getBestChineseVoice(); };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
  }, []);
}
