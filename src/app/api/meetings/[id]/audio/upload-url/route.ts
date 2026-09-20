import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { createAudioUploadTarget } from "@/lib/storage/audio";
import { createAudioUploadUrlRequestSchema } from "@/shared/schemas";
import { jsonError, notFound } from "@/lib/api-response";

export const runtime = "nodejs";

/**
 * Returns a signed URL the browser can PUT the audio file to directly, so
 * the upload never has to be relayed through this server.
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
  const parsed = createAudioUploadUrlRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((i) => i.message).join(", "));
  }

  try {
    const target = await createAudioUploadTarget(id, parsed.data.fileName);
    return NextResponse.json(target);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create upload URL.";
    return jsonError(message, 502);
  }
}
