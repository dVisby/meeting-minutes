import "server-only";
import { transcribe } from "ai";
import { openai } from "@ai-sdk/openai";
import { fetchAudioWithSizeLimit } from "@/lib/ai/fetch-audio";
import type { MappedUtterance } from "@/lib/ai/diarize-map";

const MAX_BYTES = 25 * 1024 * 1024; // OpenAI's hard limit for audio.transcriptions

/**
 * OpenAI's transcription endpoint is synchronous (no async job/callback) and
 * doesn't diarize speakers — every segment is assigned a single speaker
 * label, and the caller is expected to run this in the background (the
 * process route wraps it in `after()`) rather than block the request.
 */
export async function transcribeWithOpenAI(audioUrl: string): Promise<{
  utterances: MappedUtterance[];
  language: string | null;
  durationSeconds: number | null;
}> {
  const { data } = await fetchAudioWithSizeLimit(audioUrl, MAX_BYTES);

  const result = await transcribe({
    model: openai.transcription("whisper-1"),
    audio: data,
  });

  const utterances: MappedUtterance[] = result.segments.map((segment, index) => ({
    speaker_label: "0",
    start_time: segment.startSecond,
    end_time: segment.endSecond,
    text: segment.text.trim(),
    sequence: index,
  }));

  return {
    utterances,
    language: result.language ?? null,
    durationSeconds: result.durationInSeconds ?? null,
  };
}
