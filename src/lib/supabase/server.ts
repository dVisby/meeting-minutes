import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-only client using the service-role key. Phase 1 has no auth, so this
 * is the only client used by API routes/server actions; RLS stays enabled
 * with no permissive policies, and this key is the sole way in.
 *
 * Not typed against `./types` (Database) yet: supabase-js's generated-types
 * generic requires a shape (Views/Functions/Enums/Relationships) that only a
 * real `supabase gen types` run produces correctly. Once a project is linked,
 * regenerate types.ts and restore `createClient<Database>(...)` here.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

/**
 * Cookie-aware client that acts as the signed-in user (anon key + their
 * session), for use in Server Components, Route Handlers and Server Actions.
 * Every meeting-scoped query filters by `user_id` using the user this
 * resolves to — never trust the service-role client for user-facing reads.
 */
export async function createSessionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
  }

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, where cookies are read-only;
          // middleware refreshes the session cookie on the next navigation.
        }
      },
    },
  });
}

/** Throws-if-unauthenticated helper for pages/actions that require a signed-in user. */
export async function requireUser() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }
  return user;
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()));
}
