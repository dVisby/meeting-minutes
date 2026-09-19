import { NextResponse } from "next/server";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getSignedAudioUrl } from "@/lib/storage/audio";
import { startTranscription } from "@/lib/ai/transcribe";
import { startAzureTranscription } from "@/lib/ai/transcribe-azure";
import { transcribeWithOpenAI } from "@/lib/ai/transcribe-openai";
import { transcribeWithGemini } from "@/lib/ai/transcribe-gemini";
import { finalizeTranscript } from "@/lib/ai/finalize-transcript";
import { transcriptionModelOptions, type TranscriptionProvider } from "@/shared/schemas";
import { jsonError, notFound } from "@/lib/api-response";

export const runtime = "nodejs";
export const maxDuration = 300;

function providerForModel(model: string): TranscriptionProvider {
  return transcriptionModelOptions.find((o) => o.value === model)?.provider ?? "deepgram";
}

async function markFailed(meetingId: string, err: unknown) {
  const message = err instanceof Error ? err.message : "Transcription failed.";
  const supabase = createServiceClient();
  await supabase
    .from("meetings")
    .update({ status: "failed", error_message: message, updated_at: new Date().toISOString() })
    .eq("id", meetingId);
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id, audio_path, status, transcription_model")
    .eq("id", id)
    .maybeSingle();
  if (meetingError) return jsonError(meetingError.message, 500);
  if (!meeting) return notFound("Meeting");
  if (!meeting.audio_path) return jsonError("Meeting has no uploaded audio yet.");

  const provider = providerForModel(meeting.transcription_model);

  const appUrl = process.env.APP_URL;
  if (provider === "deepgram" && !appUrl) {
    return jsonError("Missing APP_URL environment variable.", 500);
  }

  try {
    const audioUrl = await getSignedAudioUrl(meeting.audio_path);

    if (provider === "deepgram") {
      // Deepgram pushes the result to our webhook once done — nothing more
      // to do here than kick the job off.
      const callbackUrl = `${appUrl}/api/webhooks/deepgram?meetingId=${id}`;
      await startTranscription({ audioUrl, callbackUrl, model: meeting.transcription_model });
    } else if (provider === "azure") {
      // Azure's batch API has no push callback; the poll cron
      // (/api/cron/poll-transcriptions) picks this job ref up.
      const { jobRef } = await startAzureTranscription({ audioUrl });
      const { error: jobRefError } = await supabase
        .from("meetings")
        .update({ transcription_job_ref: jobRef })
        .eq("id", id);
      if (jobRefError) throw new Error(jobRefError.message);
    } else if (provider === "openai") {
      // Synchronous API — run it after the response is sent so the client
      // gets the same immediate 202 it would for an async provider.
      after(async () => {
        try {
          const { utterances, language, durationSeconds } = await transcribeWithOpenAI(audioUrl);
          await finalizeTranscript({
            meetingId: id,
            provider: "openai",
            language,
            durationSeconds,
            rawResponse: null,
            utterances,
          });
        } catch (err) {
          await markFailed(id, err);
        }
      });
    } else if (provider === "google") {
      after(async () => {
        try {
          const { utterances, language } = await transcribeWithGemini(audioUrl);
          await finalizeTranscript({
            meetingId: id,
            provider: "google",
            language,
            durationSeconds: null,
            rawResponse: null,
            utterances,
          });
        } catch (err) {
          await markFailed(id, err);
        }
      });
    }
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
