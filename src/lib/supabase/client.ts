"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cookie-aware browser client (writes the same sb-* cookies the server reads),
 * used only for the magic-link callback's implicit-flow fallback — see
 * src/app/auth/callback/page.tsx. Everything else goes through Server
 * Components/Actions via createSessionClient.
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
  }
  return createBrowserClient(url, anonKey);
}
