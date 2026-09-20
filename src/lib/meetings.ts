import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * All meeting-scoped API routes go through the service-role client (RLS is
 * enabled with no permissive policies, so it's the only way in), which means
 * ownership has to be enforced in application code — this is the one place
 * that check lives, so no route can forget it.
 */
export async function isMeetingOwner(meetingId: string, userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("id")
    .eq("id", meetingId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}
