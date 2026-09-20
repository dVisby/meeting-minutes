import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { HashSessionHandler } from "@/components/auth/hash-session-handler";

/**
 * Handles both shapes Supabase's magic-link verify endpoint can redirect
 * back with: a PKCE `?code=` (exchanged here, server-side) or — the default
 * for email/magic-link with the stock email template — session tokens in the
 * URL *fragment* (`#access_token=...`), which never reaches the server, so
 * that case is handed off to a client component that reads it directly.
 */
export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string }>;
}) {
  const { code, next = "/" } = await searchParams;

  if (code) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
    redirect("/login?error=auth");
  }

  return <HashSessionHandler next={next} />;
}
