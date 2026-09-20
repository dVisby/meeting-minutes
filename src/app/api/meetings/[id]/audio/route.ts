import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { confirmAudioUploadRequestSchema } from "@/shared/schemas";
import { getSignedAudioUrl } from "@/lib/storage/audio";
import { jsonError, notFound } from "@/lib/api-response";

export const runtime = "nodejs";

/** Returns a short-lived signed URL for the browser's <audio> element to play. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = createServiceClient();

  const { data: meeting, error } = await supabase
    .from("meetings")
    .select("audio_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!meeting) return notFound("Meeting");
  if (!meeting.audio_path) return notFound("Audio");

  const url = await getSignedAudioUrl(meeting.audio_path);
  return NextResponse.json({ url });
}

/**
 * Called once the browser has finished uploading the file straight to
 * Supabase Storage (see `audio/upload-url`); this just records where it
 * landed. It never sees the file bytes.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = createServiceClient();

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (meetingError) return jsonError(meetingError.message, 500);
  if (!meeting) return notFound("Meeting");

  const body = await request.json().catch(() => null);
  const parsed = confirmAudioUploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((i) => i.message).join(", "));
  }
  if (!parsed.data.path.startsWith(`${id}/`)) {
    return jsonError("Path does not belong to this meeting.");
  }

  const { data: updated, error: updateError } = await supabase
    .from("meetings")
    .update({ audio_path: parsed.data.path, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (updateError) return jsonError(updateError.message, 500);
  return NextResponse.json({ meeting: updated });
}
