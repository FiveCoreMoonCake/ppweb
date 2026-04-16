import { allChars, type CharItem } from "@/data/characters";
import type { CharRecord, QuizQuestion, PoolEntry, WrongCharEntry } from "./types";
import { shuffle } from "./shuffle";
import { EBBINGHAUS_INTERVALS } from "./spaced-repetition";
import { todayStr } from "./supabase-progress";
import { getConfusableChars } from "./confusables";

/**
 * Sort entries by spaced-repetition level ascending, shuffle within each level.
 * Lower level = struggling more = higher priority within the bucket.
 */
function shuffleByLevel(entries: PoolEntry[], recs: Record<string, CharRecord>): PoolEntry[] {
  const byLevel = new Map<number, PoolEntry[]>();
  for (const e of entries) {
    const lv = recs[e.item.char]?.interval ?? 0;
    if (!byLevel.has(lv)) byLevel.set(lv, []);
    byLevel.get(lv)!.push(e);
  }
  return [...byLevel.keys()]
    .sort((a, b) => a - b)
    .flatMap((lv) => shuffle(byLevel.get(lv)!));
}

/**
 * Generate quiz questions with anti-gaming priority allocation.
 *
 * Priority order (prevents child from gaming by deliberately answering wrong):
 *   1. New chars (40%): learned but never quizzed — top priority, child cannot avoid
 *   2. Due for review (25%): spaced repetition schedule
 *   3. Easy-wrong (25%): accuracy < 50%, attempts >= 3
 *      Sorted by level ascending within bucket — level 0 (struggling) picked first,
 *      level 3+ (recovering) only fills remaining slots. No hard cutoff.
 *   4. Rest (10%): background maintenance
 *
 * @param progress Set of learned characters (from literacy_progress)
 * @param count Number of questions to generate
 * @param records Spaced repetition records
 * @param groupIds Optional: if provided, use chars from these groups (by-group mode);
 *                 if omitted, use all learned chars from progress (all-learned mode)
 */
export function generateQuiz(
  progress: Set<string>,
  count: number,
  records: Record<string, CharRecord>,
  groupIds?: string[],
): QuizQuestion[] {
  // Determine the character pool based on range mode
  const chars = groupIds
    ? allChars.filter((c) => groupIds.includes(c.groupId))
    : allChars.filter((c) => progress.has(c.char));

  const today = todayStr();

  // Expand: each reading of each char is a separate pool entry
  const pool: PoolEntry[] = chars.flatMap((item) =>
    item.readings.map((_, ri) => ({ item, readingIdx: ri }))
  );

  // Categorize with anti-gaming priorities
  const newChars: PoolEntry[] = [];
  const dueForReview: PoolEntry[] = [];
  const easyWrong: PoolEntry[] = [];
  const rest: PoolEntry[] = [];

  for (const entry of pool) {
    const rec = records[entry.item.char];
    if (!rec) {
      // Never answered — highest priority
      newChars.push(entry);
    } else {
      const total = rec.right + rec.wrong;
      const accuracy = total > 0 ? rec.right / total : 1;
      const isEasyWrong = accuracy < 0.5 && total >= 3;
      const isDue = rec.nextReview <= today;
      const isMastered = rec.interval >= EBBINGHAUS_INTERVALS.length - 1;

      if (isDue && !isEasyWrong) {
        dueForReview.push(entry);
      } else if (isEasyWrong) {
        easyWrong.push(entry);
      } else if (isMastered) {
        // Mastered and not due: skip entirely
        continue;
      } else {
        rest.push(entry);
      }
    }
  }

  // Fix A: Use Math.floor + remainder to prevent rounding overshoot
  const targets = [
    { bucket: shuffle(newChars),                  pct: 0.4 },
    { bucket: shuffleByLevel(dueForReview, records), pct: 0.25 },
    { bucket: shuffleByLevel(easyWrong, records),    pct: 0.25 },
    { bucket: shuffle(rest),                      pct: 0.1 },
  ];

  const allocations = targets.map((t, i, arr) => {
    if (i < arr.length - 1) return Math.floor(count * t.pct);
    return count - arr.slice(0, -1).reduce((s, x) => s + Math.floor(count * x.pct), 0);
  });

  const seen = new Set<string>();
  const picked: PoolEntry[] = [];

  // First pass: fill each bucket up to its allocation
  let remaining = count;
  for (let tIdx = 0; tIdx < targets.length; tIdx++) {
    const { bucket } = targets[tIdx];
    const alloc = allocations[tIdx];
    let filled = 0;
    for (const entry of bucket) {
      if (filled >= alloc || remaining <= 0) break;
      if (seen.has(entry.item.char)) continue;
      seen.add(entry.item.char);
      picked.push(entry);
      filled++;
      remaining--;
    }
  }

  // Second pass: overflow — fill remaining slots from any bucket in priority order
  if (remaining > 0) {
    for (const { bucket } of targets) {
      for (const entry of bucket) {
        if (remaining <= 0) break;
        if (seen.has(entry.item.char)) continue;
        seen.add(entry.item.char);
        picked.push(entry);
        remaining--;
      }
      if (remaining <= 0) break;
    }
  }

  // Fix B: Prefer confusable chars > same-group > other-group distractors, with global fallback
  const questions = picked.map((entry) => {
    const confusableCharNames = getConfusableChars(entry.item.char);
    const confusables = shuffle(chars.filter((c) => confusableCharNames.includes(c.char)));
    const sameGroup = shuffle(chars.filter((c) => c.char !== entry.item.char && c.groupId === entry.item.groupId && !confusableCharNames.includes(c.char)));
    const otherGroup = shuffle(chars.filter((c) => c.char !== entry.item.char && c.groupId !== entry.item.groupId && !confusableCharNames.includes(c.char)));

    const distractors: CharItem[] = [];
    // Priority 1: confusable characters (hardest distractors)
    for (const c of confusables) { if (distractors.length >= 3) break; distractors.push(c); }
    // Priority 2: same group
    for (const c of sameGroup) { if (distractors.length >= 3) break; distractors.push(c); }
    // Priority 3: other groups
    for (const c of otherGroup) { if (distractors.length >= 3) break; distractors.push(c); }

    // Global fallback if selected range is too small
    if (distractors.length < 3) {
      const globalFallback = shuffle(allChars.filter(
        (c) => c.char !== entry.item.char && !distractors.some((d) => d.char === c.char)
      ));
      for (const c of globalFallback) { if (distractors.length >= 3) break; distractors.push(c); }
    }

    return {
      correct: entry.item,
      readingIdx: entry.readingIdx,
      options: shuffle([entry.item, ...distractors]),
    };
  });

  // Fix C: Enhanced consecutive duplicate prevention (forward + backward swap)
  for (let i = 1; i < questions.length; i++) {
    if (questions[i].correct.char === questions[i - 1].correct.char) {
      let swapped = false;
      // Try forward swap
      for (let j = i + 1; j < questions.length; j++) {
        if (
          questions[j].correct.char !== questions[i - 1].correct.char &&
          (i + 1 >= questions.length || questions[j].correct.char !== questions[i + 1]?.correct.char)
        ) {
          [questions[i], questions[j]] = [questions[j], questions[i]];
          swapped = true;
          break;
        }
      }
      // Try backward swap if forward didn't work
      if (!swapped) {
        for (let j = i - 2; j >= 0; j--) {
          if (
            questions[j].correct.char !== questions[i].correct.char &&
            (j === 0 || questions[j].correct.char !== questions[j - 1].correct.char) &&
            (j + 1 >= questions.length || questions[j].correct.char !== questions[j + 1]?.correct.char)
          ) {
            const q = questions.splice(i, 1)[0];
            questions.splice(j + 1, 0, q);
            break;
          }
        }
      }
    }
  }

  return questions;
}

/**
 * Pick 9 random single-reading chars from learned characters.
 * Fix E: Uses Fisher-Yates shuffle instead of biased sort.
 */
export function generateListenGrid(progress: Set<string>): CharItem[] {
  const pool = allChars.filter((c) => progress.has(c.char) && c.readings.length === 1);
  return shuffle(pool).slice(0, 9);
}

/** Get characters with accuracy < 50% and >= 3 attempts */
export function getWrongChars(records: Record<string, CharRecord>): WrongCharEntry[] {
  return Object.entries(records)
    .filter(([, rec]) => {
      const total = rec.right + rec.wrong;
      return total >= 3 && rec.right / total < 0.5;
    })
    .map(([char, rec]) => ({
      char,
      right: rec.right,
      wrong: rec.wrong,
      accuracy: rec.right / (rec.right + rec.wrong),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}
