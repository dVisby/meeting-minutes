import { NextRequest, NextResponse } from "next/server";
import { mapDeepgramUtterances, type DeepgramCallbackPayload } from "@/lib/ai/diarize-map";
import { finalizeTranscript } from "@/lib/ai/finalize-transcript";
import { jsonError } from "@/lib/api-response";
import { verifyMeetingToken } from "@/lib/webhook-token";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const meetingId = request.nextUrl.searchParams.get("meetingId");
  if (!meetingId) return jsonError("Missing meetingId query parameter.");

  // The callback URL is signed in the process route; reject anything we didn't issue.
  if (!verifyMeetingToken(meetingId, request.nextUrl.searchParams.get("token"))) {
    return jsonError("Unauthorized", 401);
  }

  const payload = (await request.json().catch(() => null)) as DeepgramCallbackPayload | null;
  if (!payload?.results) return jsonError("Invalid Deepgram callback payload.");

  try {
    // Deepgram retries the callback if it doesn't get a timely response, and
    // "Yeniden Dene" re-runs this same flow for a meeting that was already
    // processed once — finalizeTranscript upserts/replaces rather than
    // inserting blindly, so both cases are safe to re-run.
    await finalizeTranscript({
      meetingId,
      provider: "deepgram",
      language: payload.metadata?.language ?? null,
      durationSeconds: payload.metadata?.duration ?? null,
      rawResponse: payload,
      utterances: mapDeepgramUtterances(payload),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process transcription callback.";
    return jsonError(message, 500);
  }
}
