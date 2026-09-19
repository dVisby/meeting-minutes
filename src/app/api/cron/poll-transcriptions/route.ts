import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { pollAzureTranscription } from "@/lib/ai/transcribe-azure";
import { finalizeTranscript } from "@/lib/ai/finalize-transcript";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Azure's batch transcription API has no push callback like Deepgram's, so a
 * Vercel Cron job (see vercel.json) hits this route every few minutes to
 * check on any meeting whose job is still in flight.
 */
export async function GET(request: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();
  const { data: pending, error } = await supabase
    .from("meetings")
    .select("id, transcription_job_ref")
    .eq("status", "transcribing")
    .eq("transcription_model", "azure-speech")
    .not("transcription_job_ref", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = await Promise.allSettled(
    (pending ?? []).map(async (meeting) => {
      const jobRef = meeting.transcription_job_ref as string;
      const result = await pollAzureTranscription(jobRef);

      if (result.status === "running") return { id: meeting.id, status: "running" as const };

      if (result.status === "failed") {
        await supabase
          .from("meetings")
          .update({ status: "failed", error_message: result.error, updated_at: new Date().toISOString() })
          .eq("id", meeting.id);
        return { id: meeting.id, status: "failed" as const };
      }

      await finalizeTranscript({
        meetingId: meeting.id,
        provider: "azure",
        language: result.language,
        durationSeconds: result.durationSeconds,
        rawResponse: result.rawResponse,
        utterances: result.utterances,
      });
      return { id: meeting.id, status: "done" as const };
    })
  );

  return NextResponse.json({
    checked: pending?.length ?? 0,
    results: results.map((r) => (r.status === "fulfilled" ? r.value : { error: String(r.reason) })),
  });
}
