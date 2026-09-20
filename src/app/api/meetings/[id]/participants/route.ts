import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { isMeetingOwner } from "@/lib/meetings";
import { mapSpeakerRequestSchema } from "@/shared/schemas";
import { jsonError, notFound } from "@/lib/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!(await isMeetingOwner(id, user.id))) return notFound("Meeting");
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("participants").select("*").eq("meeting_id", id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ participants: data });
}

/** Maps a Deepgram speaker label (e.g. "0") to a human name, without re-running transcription. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!(await isMeetingOwner(id, user.id))) return notFound("Meeting");
  const body = await request.json().catch(() => null);
  const parsed = mapSpeakerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const supabase = createServiceClient();
  const { speakerLabel, name } = parsed.data;

  const { data: existing, error: findError } = await supabase
    .from("participants")
    .select("id")
    .eq("meeting_id", id)
    .eq("speaker_label", speakerLabel)
    .maybeSingle();
  if (findError) return jsonError(findError.message, 500);

  if (existing) {
    const { data, error } = await supabase
      .from("participants")
      .update({ name, source: "manual" })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ participant: data });
  }

  const { data, error } = await supabase
    .from("participants")
    .insert({ meeting_id: id, name, speaker_label: speakerLabel, source: "manual" })
    .select()
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ participant: data }, { status: 201 });
}
