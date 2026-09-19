import "server-only";

/**
 * Deepgram's callback payload shape (results.utterances), narrowed to the
 * fields we persist. Matches @deepgram/sdk's ListenV1Response.results.
 */
export interface DeepgramCallbackPayload {
  metadata?: {
    duration?: number;
    language?: string;
    model_info?: Record<string, unknown>;
    [key: string]: unknown;
  };
  results: {
    channels: unknown;
    utterances?: Array<{
      start?: number;
      end?: number;
      transcript?: string;
      speaker?: number;
    }>;
  };
}

export interface MappedUtterance {
  speaker_label: string;
  start_time: number;
  end_time: number;
  text: string;
  sequence: number;
}

/** Maps Deepgram's utterances array into rows ready for the `utterances` table. */
export function mapDeepgramUtterances(payload: DeepgramCallbackPayload): MappedUtterance[] {
  const utterances = payload.results.utterances ?? [];
  return utterances
    .filter((u) => typeof u.start === "number" && typeof u.end === "number" && u.transcript)
    .map((u, index) => ({
      speaker_label: String(u.speaker ?? 0),
      start_time: u.start as number,
      end_time: u.end as number,
      text: (u.transcript as string).trim(),
      sequence: index,
    }));
}

export function concatenateUtterances(utterances: MappedUtterance[]): string {
  return utterances.map((u) => `[Konuşmacı ${u.speaker_label}] ${u.text}`).join("\n");
}
