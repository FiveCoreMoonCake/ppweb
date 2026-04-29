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

    // Range-only fallback (do not leak chars outside selected range)
    if (distractors.length < 3) {
      const rangeFallback = shuffle(chars.filter(
        (c) => c.char !== entry.item.char && !distractors.some((d) => d.char === c.char)
      ));
      for (const c of rangeFallback) { if (distractors.length >= 3) break; distractors.push(c); }
    }

    return {
      correct: entry.item,
      readingIdx: entry.readingIdx,
      options: shuffle([entry.item, ...distractors]),
    };
  });

  // Safety guard: when group range is provided, ensure no question or distractor
  // leaks outside the selected groups (defensive — should already be true by
  // construction, but keep as a hard guarantee for the user-visible promise).
  if (groupIds && groupIds.length > 0) {
    const allowed = new Set(groupIds);
    for (let i = questions.length - 1; i >= 0; i--) {
      const q = questions[i];
      if (!allowed.has(q.correct.groupId)) {
        questions.splice(i, 1);
        continue;
      }
      // Ensure all distractor options are also in-range; if not, drop them and
      // refill from in-range chars not already present in the question.
      const inRange = q.options.filter((o) => allowed.has(o.groupId));
      if (inRange.length < q.options.length) {
        const present = new Set(inRange.map((o) => o.char));
        const refill = shuffle(
          chars.filter((c) => !present.has(c.char))
        );
        while (inRange.length < 4 && refill.length > 0) {
          inRange.push(refill.shift()!);
        }
        q.options = shuffle(inRange.slice(0, 4));
      }
    }
  }

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
 * Generate a 9-char listen grid using the same spaced-repetition priority
 * strategy as generateQuiz: new → due → easy-wrong → rest.
 * Also seeds the grid with confusable pairs to increase difficulty.
 *
 * @param progress Learned-chars set (used in all-learned mode)
 * @param records  Spaced repetition records
 * @param groupIds Optional: when provided, draw from chars in these groups instead of progress
 */
export function generateListenGrid(
  progress: Set<string>,
  records: Record<string, CharRecord>,
  groupIds?: string[],
): CharItem[] {
  const today = todayStr();
  const pool = groupIds && groupIds.length > 0
    ? allChars.filter((c) => groupIds.includes(c.groupId) && c.readings.length === 1)
    : allChars.filter((c) => progress.has(c.char) && c.readings.length === 1);
  if (pool.length < 9) return shuffle(pool);

  // Categorize with same priority buckets as quiz
  const newChars: CharItem[] = [];
  const dueForReview: CharItem[] = [];
  const easyWrong: CharItem[] = [];
  const rest: CharItem[] = [];

  for (const item of pool) {
    const rec = records[item.char];
    if (!rec) {
      newChars.push(item);
    } else {
      const total = rec.right + rec.wrong;
      const accuracy = total > 0 ? rec.right / total : 1;
      const isEasyWrong = accuracy < 0.5 && total >= 3;
      const isDue = rec.nextReview <= today;
      const isMastered = rec.interval >= EBBINGHAUS_INTERVALS.length - 1;

      if (isDue && !isEasyWrong) {
        dueForReview.push(item);
      } else if (isEasyWrong) {
        easyWrong.push(item);
      } else if (!isMastered) {
        rest.push(item);
      }
    }
  }

  // Allocate 9 slots: new(4) → due(2) → easyWrong(2) → rest(1)
  const buckets = [
    shuffle(newChars),
    shuffle(dueForReview),
    shuffle(easyWrong),
    shuffle(rest),
  ];
  const allocs = [4, 2, 2, 1];

  const seen = new Set<string>();
  const picked: CharItem[] = [];

  // First pass: fill each bucket
  for (let b = 0; b < buckets.length; b++) {
    let filled = 0;
    for (const item of buckets[b]) {
      if (picked.length >= 9) break;
      if (filled >= allocs[b]) break;
      if (seen.has(item.char)) continue;
      seen.add(item.char);
      picked.push(item);
      filled++;
    }
  }

  // Second pass: overflow from any bucket
  if (picked.length < 9) {
    for (const bucket of buckets) {
      for (const item of bucket) {
        if (picked.length >= 9) break;
        if (seen.has(item.char)) continue;
        seen.add(item.char);
        picked.push(item);
      }
      if (picked.length >= 9) break;
    }
  }

  // Final fallback: fill from full pool
  if (picked.length < 9) {
    for (const item of shuffle(pool)) {
      if (picked.length >= 9) break;
      if (seen.has(item.char)) continue;
      seen.add(item.char);
      picked.push(item);
    }
  }

  // Seed confusable pairs: for each picked char, if its confusable is in the
  // pool and not yet picked, swap out the last rest-bucket char to include it
  const confusableExtras: CharItem[] = [];
  for (const item of [...picked]) {
    const confChars = getConfusableChars(item.char);
    for (const cc of confChars) {
      if (seen.has(cc)) continue;
      const confItem = pool.find((c) => c.char === cc);
      if (confItem) confusableExtras.push(confItem);
    }
  }
  // Replace tail of picked with confusable extras (max 2 swaps)
  for (let i = 0; i < Math.min(confusableExtras.length, 2); i++) {
    if (picked.length >= 9) {
      picked[picked.length - 1 - i] = confusableExtras[i];
    }
  }

  return shuffle(picked.slice(0, 9));
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
