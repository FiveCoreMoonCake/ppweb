"use client";

import { supabase } from "@/lib/supabase";
import type { CharRecord } from "./types";

/* ── Date helpers ── */

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ── Progress (learned chars) ── */

export async function loadProgressFromDB(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("literacy_progress")
    .select("char")
    .eq("user_id", userId);
  if (error) {
    console.error("[loadProgress]", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((row: { char: string }) => row.char));
}

export async function saveProgressChar(userId: string, char: string): Promise<void> {
  const { error } = await supabase
    .from("literacy_progress")
    .upsert(
      { user_id: userId, char, learned_at: new Date().toISOString() },
      { onConflict: "user_id,char" },
    );
  if (error) console.error("[saveProgressChar]", error.message);
}

/* ── Learning records (spaced repetition data) ── */

export async function loadRecordsFromDB(userId: string): Promise<Record<string, CharRecord>> {
  const { data, error } = await supabase
    .from("literacy_records")
    .select("char, right_count, wrong_count, level, last_seen, next_review")
    .eq("user_id", userId);
  if (error) {
    console.error("[loadRecords]", error.message);
    return {};
  }
  const out: Record<string, CharRecord> = {};
  for (const row of data ?? []) {
    out[row.char] = {
      right: row.right_count ?? 0,
      wrong: row.wrong_count ?? 0,
      lastSeen: (row.last_seen ?? todayStr()).slice(0, 10),
      nextReview: (row.next_review ?? todayStr()).slice(0, 10),
      interval: row.level ?? 1,
    };
  }
  return out;
}

export async function upsertRecord(userId: string, char: string, rec: CharRecord): Promise<void> {
  const { error } = await supabase
    .from("literacy_records")
    .upsert(
      {
        user_id: userId,
        char,
        right_count: rec.right,
        wrong_count: rec.wrong,
        level: rec.interval,
        last_seen: rec.lastSeen,
        next_review: rec.nextReview,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,char" },
    );
  if (error) console.error("[upsertRecord]", error.message);
}

export async function upsertRecordWithMastered(userId: string, char: string, rec: CharRecord, mastered: boolean): Promise<void> {
  const { error } = await supabase
    .from("literacy_records")
    .upsert({
      user_id: userId,
      char,
      right_count: rec.right,
      wrong_count: rec.wrong,
      level: rec.interval,
      last_seen: rec.lastSeen,
      next_review: rec.nextReview,
      mastered,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,char" });
  if (error) console.error("[upsertRecord]", error.message);
}
