import type { CharItem } from "@/data/characters";
import type { QuizAnswer, ListenQuizResult } from "./types";

export interface QuizHistoryEntry {
  /** Epoch ms */
  timestamp: number;
  answers: QuizAnswer[];
}

export interface ListenHistoryEntry {
  /** Epoch ms */
  timestamp: number;
  result: ListenQuizResult;
  grid: CharItem[];
}

const MAX_HISTORY = 3;

function quizKey(userId: string) {
  return `cl:quizHistory:${userId}`;
}
function listenKey(userId: string) {
  return `cl:listenHistory:${userId}`;
}

function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota or serialization error — ignore
  }
}

export function loadQuizHistory(userId: string): QuizHistoryEntry[] {
  return readJSON<QuizHistoryEntry[]>(quizKey(userId)) ?? [];
}

export function loadListenHistory(userId: string): ListenHistoryEntry[] {
  return readJSON<ListenHistoryEntry[]>(listenKey(userId)) ?? [];
}

export function saveQuizHistory(userId: string, answers: QuizAnswer[]): QuizHistoryEntry[] {
  if (answers.length === 0) return loadQuizHistory(userId);
  const prev = loadQuizHistory(userId);
  const entry: QuizHistoryEntry = { timestamp: Date.now(), answers };
  const next = [entry, ...prev].slice(0, MAX_HISTORY);
  writeJSON(quizKey(userId), next);
  return next;
}

export function saveListenHistory(
  userId: string,
  result: ListenQuizResult,
  grid: CharItem[]
): ListenHistoryEntry[] {
  const prev = loadListenHistory(userId);
  const entry: ListenHistoryEntry = { timestamp: Date.now(), result, grid };
  const next = [entry, ...prev].slice(0, MAX_HISTORY);
  writeJSON(listenKey(userId), next);
  return next;
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (sameDay) return `今天 ${hm}`;
  if (isYesterday) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
}
