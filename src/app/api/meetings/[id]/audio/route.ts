import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { audioPathFor, uploadMeetingAudio } from "@/lib/storage/audio";
import { jsonError, notFound } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (meetingError) return jsonError(meetingError.message, 500);
  if (!meeting) return notFound("Meeting");

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof Blob)) {
    return jsonError("Missing 'file' field in form data.");
  }
  const fileName = file instanceof File ? file.name : "audio";

  const path = audioPathFor(id, fileName);
  await uploadMeetingAudio(path, file, file.type || "application/octet-stream");

  const { data: updated, error: updateError } = await supabase
    .from("meetings")
    .update({ audio_path: path, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (updateError) return jsonError(updateError.message, 500);
  return NextResponse.json({ meeting: updated });
}
