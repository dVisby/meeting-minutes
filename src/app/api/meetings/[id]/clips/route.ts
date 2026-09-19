import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createClipRequestSchema } from "@/shared/schemas";
import { generateClipSummary } from "@/lib/ai/clip-summary";
import { jsonError } from "@/lib/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("clips")
    .select("*")
    .eq("meeting_id", id)
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ clips: data });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = createClipRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const supabase = createServiceClient();
  const { startTime, endTime } = parsed.data;

  const { data: utterances, error: utterancesError } = await supabase
    .from("utterances")
    .select("speaker_label, text, start_time, end_time")
    .eq("meeting_id", id)
    .lte("start_time", endTime)
    .gte("end_time", startTime)
    .order("start_time");

  if (utterancesError) return jsonError(utterancesError.message, 500);
  if (!utterances || utterances.length === 0) {
    return jsonError("No transcript found in the given time range.");
  }

  const segmentText = utterances
    .map((u) => `[Konuşmacı ${u.speaker_label}] ${u.text}`)
    .join("\n");

  try {
    const { title, summary } = await generateClipSummary(segmentText);

    const { data: clip, error: clipError } = await supabase
      .from("clips")
      .insert({
        meeting_id: id,
        start_time: startTime,
        end_time: endTime,
        title,
        summary,
      })
      .select()
      .single();

    if (clipError) return jsonError(clipError.message, 500);
    return NextResponse.json({ clip }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate clip summary.";
    return jsonError(message, 502);
  }
}
