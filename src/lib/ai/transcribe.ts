import "server-only";
import { DeepgramClient } from "@deepgram/sdk";
import { getApiKey } from "@/lib/secrets";

let client: DeepgramClient | undefined;
let clientKey: string | undefined;

async function getDeepgramClient() {
  const apiKey = await getApiKey("DEEPGRAM_API_KEY");
  // Cache is keyed on the resolved key too, so an admin updating it in the
  // panel takes effect on the next call instead of sticking to the first
  // key this process instance ever saw.
  if (!client || clientKey !== apiKey) {
    client = new DeepgramClient({ apiKey });
    clientKey = apiKey;
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
  const deepgram = await getDeepgramClient();
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
