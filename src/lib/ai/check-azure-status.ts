import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { pollAzureTranscription } from "@/lib/ai/transcribe-azure";
import { finalizeTranscript } from "@/lib/ai/finalize-transcript";

/**
 * Azure's batch API has no push callback, so completion is normally only
 * checked by the daily cron (Vercel Hobby plan caps cron frequency at once a
 * day). The meeting detail page also calls this — via `after()`, on every
 * 4s auto-refresh from MeetingStatusIndicator — so anyone actually watching
 * a transcribing Azure meeting gets a near-real-time result instead of
 * waiting for the next cron tick.
 */
export async function checkAzureMeetingStatus(
  meetingId: string,
  jobRef: string
): Promise<"running" | "done" | "failed" | "skipped"> {
  const supabase = createServiceClient();

  // A concurrent check (another refresh, or the cron) may have already
  // finished this meeting; bail out instead of redoing the Azure/Claude work.
  const { data: current } = await supabase
    .from("meetings")
    .select("status")
    .eq("id", meetingId)
    .maybeSingle();
  if (current?.status !== "transcribing") return "skipped";

  const result = await pollAzureTranscription(jobRef);
  if (result.status === "running") return "running";

  if (result.status === "failed") {
    await supabase
      .from("meetings")
      .update({ status: "failed", error_message: result.error, updated_at: new Date().toISOString() })
      .eq("id", meetingId);
    return "failed";
  }

  await finalizeTranscript({
    meetingId,
    provider: "azure",
    language: result.language,
    durationSeconds: result.durationSeconds,
    rawResponse: result.rawResponse,
    utterances: result.utterances,
  });
  return "done";
}
