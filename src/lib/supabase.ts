import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Missing Supabase environment variables. " +
          "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
    }

    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

/**
 * Lazily-initialised Supabase client.
 *
 * During Next.js static generation / SSR the env vars may not exist yet,
 * so we defer `createClient()` until the property is actually accessed
 * at runtime in the browser (inside useEffect / event handlers).
 *
 * The Proxy also guards against SSR access: if code running on the server
 * tries to use the client before env vars are set, it will throw a clear
 * error instead of silently sending requests with undefined credentials.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    // Allow certain built-in symbol access that bundlers / React may probe
    // during SSR without actually needing the real client.
    if (typeof prop === "symbol") return undefined;
    if (prop === "then") return undefined; // Prevent Promise-like detection
    if (prop === "toJSON") return undefined;

    return Reflect.get(getSupabase(), prop, receiver);
  },
});
