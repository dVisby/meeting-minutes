import { NextResponse } from "next/server";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { deleteAudioFile } from "@/lib/storage/audio";
import { jsonError, notFound } from "@/lib/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = createServiceClient();

  const [meetingRes, minutesRes, participantsRes, actionItemsRes] = await Promise.all([
    supabase.from("meetings").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
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

/** Cascades to transcripts/utterances/minutes/action_items/clips (FK `on delete cascade`). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = createServiceClient();

  const { data: meeting, error: fetchError } = await supabase
    .from("meetings")
    .select("audio_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (fetchError) return jsonError(fetchError.message, 500);
  if (!meeting) return notFound("Meeting");

  if (meeting.audio_path) {
    // Best-effort: don't block the row delete on a storage hiccup.
    await deleteAudioFile(meeting.audio_path).catch(() => {});
  }

  const { error: deleteError } = await supabase.from("meetings").delete().eq("id", id).eq("user_id", user.id);
  if (deleteError) return jsonError(deleteError.message, 500);

  return NextResponse.json({ ok: true });
}
