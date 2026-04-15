import type { CharItem } from "@/data/characters";

export interface CharRecord {
  right: number;
  wrong: number;
  lastSeen: string;     // ISO date string (YYYY-MM-DD)
  nextReview: string;   // ISO date string (YYYY-MM-DD)
  interval: number;     // level 0-5 index into EBBINGHAUS_INTERVALS
}

export interface QuizQuestion {
  correct: CharItem;
  /** Which reading is being tested (index into correct.readings[]) */
  readingIdx: number;
  options: CharItem[];
}

export interface QuizAnswer {
  question: QuizQuestion;
  selected: string;
  isCorrect: boolean;
}

/** Pool entry: one entry per reading per char */
export interface PoolEntry {
  item: CharItem;
  readingIdx: number;
}

export interface ListenRoundMistake {
  /** The char that was being asked */
  target: CharItem;
  /** Chars the player incorrectly tapped before getting it right */
  wrongTaps: string[];
}

export interface ListenQuizResult {
  /** Total mistakes across all rounds */
  totalMistakes: number;
  /** Details of each mistake */
  mistakes: ListenRoundMistake[];
}

export interface WrongCharEntry {
  char: string;
  right: number;
  wrong: number;
  accuracy: number;
}

export type Mode =
  | "home"
  | "learn"
  | "quiz-settings"
  | "quiz-play"
  | "quiz-results"
  | "listen-quiz-settings"
  | "listen-quiz-play"
  | "listen-quiz-results"
  | "wrongList";
