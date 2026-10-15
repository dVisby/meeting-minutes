import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkAzureMeetingStatus } from "@/lib/ai/check-azure-status";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Azure's batch transcription API has no push callback like Deepgram's, so a
 * Vercel Cron job (see vercel.json) hits this route every few minutes to
 * check on any meeting whose job is still in flight.
 */
export async function GET(request: NextRequest) {
  // Fail closed: without CRON_SECRET anyone could trigger this route, so only
  // skip the check in local development.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
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
    (pending ?? []).map(async (meeting) => ({
      id: meeting.id,
      status: await checkAzureMeetingStatus(meeting.id, meeting.transcription_job_ref as string),
    }))
  );

  return NextResponse.json({
    checked: pending?.length ?? 0,
    results: results.map((r) => (r.status === "fulfilled" ? r.value : { error: String(r.reason) })),
  });
}
