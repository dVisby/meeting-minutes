import "server-only";
import { DeepgramClient } from "@deepgram/sdk";

let client: DeepgramClient | undefined;

function getDeepgramClient() {
  if (!client) {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error("Missing DEEPGRAM_API_KEY environment variable.");
    }
    client = new DeepgramClient({ apiKey });
  }
  return client;
}

/**
 * Kicks off Deepgram's async prerecorded transcription for a signed audio URL.
 * Deepgram diarizes speakers and segments the transcript into utterances, then
 * POSTs the full result to `callbackUrl` once processing finishes — the caller
 * does not block on transcription completing.
 */
export async function startTranscription(args: {
  audioUrl: string;
  callbackUrl: string;
  model?: string;
}) {
  const deepgram = getDeepgramClient();
  const result = await deepgram.listen.v1.media.transcribeUrl({
    url: args.audioUrl,
    // callback defaults to POST; passing callback_method explicitly (even "POST")
    // currently makes Deepgram's API reject the request with "Invalid query string."
    callback: args.callbackUrl,
    model: args.model ?? "nova-3",
    language: process.env.DEEPGRAM_LANGUAGE ?? "tr",
    diarize: true,
    utterances: true,
    punctuate: true,
    smart_format: true,
  });

  if (!("request_id" in result)) {
    throw new Error(
      "Deepgram returned a synchronous response instead of accepting the async callback job."
    );
  }

  return { requestId: result.request_id };
}
