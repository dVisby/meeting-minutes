import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { jsonError, notFound } from "@/lib/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [meetingRes, minutesRes, participantsRes, actionItemsRes] = await Promise.all([
    supabase.from("meetings").select("*").eq("id", id).maybeSingle(),
    supabase.from("minutes").select("*").eq("meeting_id", id).maybeSingle(),
    supabase.from("participants").select("*").eq("meeting_id", id),
    supabase.from("action_items").select("*").eq("meeting_id", id).order("created_at"),
  ]);

  if (meetingRes.error) return jsonError(meetingRes.error.message, 500);
  if (!meetingRes.data) return notFound("Meeting");

  return NextResponse.json({
    meeting: meetingRes.data,
    minutes: minutesRes.data ?? null,
    participants: participantsRes.data ?? [],
    actionItems: actionItemsRes.data ?? [],
  });
}
