import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getSignedAudioUrl } from "@/lib/storage/audio";
import { startTranscription } from "@/lib/ai/transcribe";
import { jsonError, notFound } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id, audio_path, status")
    .eq("id", id)
    .maybeSingle();
  if (meetingError) return jsonError(meetingError.message, 500);
  if (!meeting) return notFound("Meeting");
  if (!meeting.audio_path) return jsonError("Meeting has no uploaded audio yet.");

  const appUrl = process.env.APP_URL;
  if (!appUrl) return jsonError("Missing APP_URL environment variable.", 500);

  try {
    const audioUrl = await getSignedAudioUrl(meeting.audio_path);
    const callbackUrl = `${appUrl}/api/webhooks/deepgram?meetingId=${id}`;
    await startTranscription({ audioUrl, callbackUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start transcription.";
    await supabase
      .from("meetings")
      .update({ status: "failed", error_message: message, updated_at: new Date().toISOString() })
      .eq("id", id);
    return jsonError(message, 502);
  }

  const { data: updated, error: updateError } = await supabase
    .from("meetings")
    .update({ status: "transcribing", error_message: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (updateError) return jsonError(updateError.message, 500);
  return NextResponse.json({ meeting: updated }, { status: 202 });
}
