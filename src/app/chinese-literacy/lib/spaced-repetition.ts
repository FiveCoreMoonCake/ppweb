import type { CharRecord } from "./types";
import { todayStr, addDays, upsertRecordWithMastered } from "./supabase-progress";

export const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15, 30]; // days

/**
 * Record an answer for a character using Ebbinghaus forgetting curve.
 * `interval` field represents the level (0-5 index into EBBINGHAUS_INTERVALS).
 * Mutates `records` in-place, persists to Supabase, and returns the updated map.
 *
 * Fix D: Wrong answers use soft decay (level - 2) instead of hard reset to 0.
 */
export function recordAnswerLocal(
  records: Record<string, CharRecord>,
  char: string,
  correct: boolean,
  userId: string,
): Record<string, CharRecord> {
  const today = todayStr();
  const prev = records[char] || { right: 0, wrong: 0, lastSeen: today, nextReview: today, interval: 0 };

  if (correct) {
    prev.right++;
    prev.interval = Math.min(prev.interval + 1, EBBINGHAUS_INTERVALS.length - 1);
    prev.nextReview = addDays(today, EBBINGHAUS_INTERVALS[prev.interval]);
  } else {
    prev.wrong++;
    prev.interval = Math.max(0, prev.interval - 2); // soft decay: drop 2 levels instead of reset to 0
    prev.nextReview = addDays(today, EBBINGHAUS_INTERVALS[prev.interval]);
  }
  prev.lastSeen = today;
  records[char] = prev;

  // Fire-and-forget persistence — also set mastered flag
  const mastered = correct && prev.interval >= EBBINGHAUS_INTERVALS.length - 1;
  upsertRecordWithMastered(userId, char, prev, mastered);

  return { ...records };
}
