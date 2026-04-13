import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types for the legacy localStorage data shapes
// ---------------------------------------------------------------------------

/** A single character's spaced-repetition record as stored in localStorage. */
interface LocalRecord {
  right: number;
  wrong: number;
  lastSeen: string;   // ISO date string, e.g. "2026-04-12"
  nextReview: string;  // ISO date string
  interval: number;    // legacy interval value (1, 2, 4, 8, 16, 32, 64)
}

/** The full map stored under "chinese-literacy-records". */
type LocalRecordsMap = Record<string, LocalRecord>;

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------

const LS_PROGRESS_KEY = "chinese-literacy-progress";
const LS_RECORDS_KEY = "chinese-literacy-records";
const LS_MIGRATION_FLAG = "migration-done";

// ---------------------------------------------------------------------------
// Interval → Level mapping
// ---------------------------------------------------------------------------

/**
 * Map the legacy `interval` value to the new `level` field.
 *
 *   interval 1  → level 0
 *   interval 2  → level 1
 *   interval 4  → level 2
 *   interval 8  → level 3
 *   interval 16 → level 4
 *   interval 32 or 64 → level 5
 */
function intervalToLevel(interval: number): number {
  switch (interval) {
    case 1:
      return 0;
    case 2:
      return 1;
    case 4:
      return 2;
    case 8:
      return 3;
    case 16:
      return 4;
    case 32:
    case 64:
      return 5;
    default:
      // For any unexpected value, clamp to nearest known level
      if (interval <= 1) return 0;
      if (interval <= 2) return 1;
      if (interval <= 4) return 2;
      if (interval <= 8) return 3;
      if (interval <= 16) return 4;
      return 5;
  }
}

/**
 * Determine whether a character is "mastered" based on its level.
 * Level 5 (the highest) is considered mastered.
 */
function isMastered(level: number): boolean {
  return level >= 5;
}

// ---------------------------------------------------------------------------
// Main migration function
// ---------------------------------------------------------------------------

/**
 * Migrate learning data from localStorage to Supabase.
 *
 * This function is designed to be called once after a user logs in.
 * It is safe to call multiple times — it will skip if migration was already
 * completed, and it will NOT clear localStorage unless every upsert succeeds.
 *
 * Call this from `auth-context.tsx` after successful login.
 *
 * @param userId - The authenticated user's UUID from Supabase Auth.
 */
export async function migrateLocalData(userId: string): Promise<void> {
  try {
    // --- Guard: skip if not in a browser environment ---
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    // --- Guard: skip if migration was already completed ---
    if (localStorage.getItem(LS_MIGRATION_FLAG) === "true") {
      return;
    }

    // --- Read localStorage data ---
    const rawProgress = localStorage.getItem(LS_PROGRESS_KEY);
    const rawRecords = localStorage.getItem(LS_RECORDS_KEY);

    // If both keys are empty/null, nothing to migrate
    if (!rawProgress && !rawRecords) {
      // Mark as done so we don't keep checking
      localStorage.setItem(LS_MIGRATION_FLAG, "true");
      return;
    }

    // --- Parse localStorage data (with safe fallbacks) ---
    let progressChars: string[] = [];
    let recordsMap: LocalRecordsMap = {};

    if (rawProgress) {
      try {
        const parsed = JSON.parse(rawProgress);
        if (Array.isArray(parsed)) {
          progressChars = parsed;
        }
      } catch (e) {
        console.warn("[migrate] Failed to parse progress data:", e);
      }
    }

    if (rawRecords) {
      try {
        const parsed = JSON.parse(rawRecords);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          recordsMap = parsed;
        }
      } catch (e) {
        console.warn("[migrate] Failed to parse records data:", e);
      }
    }

    // After parsing, double-check we actually have data to migrate
    if (progressChars.length === 0 && Object.keys(recordsMap).length === 0) {
      localStorage.setItem(LS_MIGRATION_FLAG, "true");
      return;
    }

    // ------------------------------------------------------------------
    // Step 1: Migrate progress data → literacy_progress table
    // ------------------------------------------------------------------
    if (progressChars.length > 0) {
      const progressRows = progressChars.map((char) => ({
        user_id: userId,
        char,
        learned_at: new Date().toISOString(),
      }));

      // Batch upsert — on conflict (user_id, char), do nothing (keep existing)
      const { error: progressError } = await supabase
        .from("literacy_progress")
        .upsert(progressRows, { onConflict: "user_id,char", ignoreDuplicates: true });

      if (progressError) {
        console.error("[migrate] Failed to upsert progress data:", progressError);
        // Don't clear localStorage — allow retry on next login
        return;
      }

      console.log(`[migrate] Migrated ${progressChars.length} progress entries`);
    }

    // ------------------------------------------------------------------
    // Step 2: Migrate records data → literacy_records table
    // ------------------------------------------------------------------
    if (Object.keys(recordsMap).length > 0) {
      const now = new Date().toISOString();

      // Build rows for batch upsert
      const recordRows = Object.entries(recordsMap).map(([char, record]) => {
        const level = intervalToLevel(record.interval);

        return {
          user_id: userId,
          char,
          right_count: record.right,
          wrong_count: record.wrong,
          level,
          last_seen: record.lastSeen,
          next_review: record.nextReview,
          mastered: isMastered(level),
          updated_at: now,
        };
      });

      // We need conflict-aware upsert: keep whichever has the more recent
      // last_seen / updated_at (以最新时间为准).
      //
      // Supabase's JS client `upsert` replaces on conflict by default.
      // To implement "keep the more recent" logic, we:
      //   1. First fetch existing records for this user to compare dates.
      //   2. Filter out local records that are older than the cloud version.
      //   3. Upsert only the ones that are newer (or don't exist in cloud).

      // Fetch all existing records for this user in one query
      const { data: existingRecords, error: fetchError } = await supabase
        .from("literacy_records")
        .select("char, last_seen, updated_at")
        .eq("user_id", userId);

      if (fetchError) {
        console.error("[migrate] Failed to fetch existing records:", fetchError);
        return;
      }

      // Build a lookup of existing cloud data by char
      const cloudLookup = new Map<string, { lastSeen: string; updatedAt: string }>();
      if (existingRecords) {
        for (const row of existingRecords) {
          cloudLookup.set(row.char, {
            lastSeen: row.last_seen,
            updatedAt: row.updated_at,
          });
        }
      }

      // Filter: only upsert local records that are newer than cloud
      const rowsToUpsert = recordRows.filter((row) => {
        const cloud = cloudLookup.get(row.char);

        // No cloud version exists — always migrate
        if (!cloud) return true;

        // Compare dates: local last_seen vs cloud last_seen / updated_at
        const localDate = new Date(row.last_seen).getTime();
        const cloudDate = Math.max(
          new Date(cloud.lastSeen).getTime() || 0,
          new Date(cloud.updatedAt).getTime() || 0
        );

        // Keep local if it's more recent (以最新时间为准)
        return localDate >= cloudDate;
      });

      if (rowsToUpsert.length > 0) {
        const { error: recordsError } = await supabase
          .from("literacy_records")
          .upsert(rowsToUpsert, { onConflict: "user_id,char" });

        if (recordsError) {
          console.error("[migrate] Failed to upsert records data:", recordsError);
          return;
        }

        console.log(
          `[migrate] Migrated ${rowsToUpsert.length} record entries` +
            (rowsToUpsert.length < recordRows.length
              ? ` (skipped ${recordRows.length - rowsToUpsert.length} older entries)`
              : "")
        );
      } else {
        console.log("[migrate] All local records are older than cloud — nothing to upsert");
      }
    }

    // ------------------------------------------------------------------
    // Step 3: Clear localStorage after successful migration
    // ------------------------------------------------------------------
    localStorage.removeItem(LS_PROGRESS_KEY);
    localStorage.removeItem(LS_RECORDS_KEY);
    localStorage.setItem(LS_MIGRATION_FLAG, "true");

    console.log("[migrate] Migration complete — localStorage cleared");
  } catch (error) {
    // Migration is non-critical: log but don't throw
    console.error("[migrate] Unexpected error during migration:", error);
  }
}
