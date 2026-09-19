import "server-only";
import { createClient } from "@supabase/supabase-js";

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
