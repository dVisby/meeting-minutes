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
      words?: Array<{
        word?: string;
        punctuated_word?: string;
        start?: number;
        end?: number;
        speaker?: number;
      }>;
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

interface TimedWord {
  text: string;
  start: number;
  end: number;
  speaker: number;
}

const SENTENCE_END_RE = /[.!?…]["')\]]?$/;
// A pause this long (seconds) is treated as a paragraph break even mid-sentence,
// as a safety valve for the rare case Deepgram misses terminal punctuation.
const MAX_PAUSE_SECONDS = 4;
const MAX_WORDS_PER_LINE = 60;

/**
 * Deepgram splits `utterances` on short pauses (~0.8s), which regularly cuts
 * a sentence mid-thought — especially for a single speaker who pauses to
 * breathe. We flatten every utterance's word-level timestamps and rebuild
 * lines ourselves: a line only ends at real sentence punctuation, a speaker
 * change, or an unusually long pause. Timestamps stay accurate because they
 * come from the first/last word in each rebuilt line.
 */
export function mapDeepgramUtterances(payload: DeepgramCallbackPayload): MappedUtterance[] {
  const utterances = payload.results.utterances ?? [];

  const words: TimedWord[] = utterances.flatMap((u) =>
    (u.words ?? [])
      .map((w) => ({
        text: (w.punctuated_word ?? w.word ?? "").trim(),
        start: w.start,
        end: w.end,
        speaker: w.speaker ?? u.speaker ?? 0,
      }))
      .filter(
        (w): w is TimedWord => Boolean(w.text) && typeof w.start === "number" && typeof w.end === "number"
      )
  );

  if (words.length === 0) {
    // Fall back to Deepgram's own utterance boundaries if word-level timing
    // wasn't returned for some reason.
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

  const lines: MappedUtterance[] = [];
  let buffer: TimedWord[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    lines.push({
      speaker_label: String(buffer[0].speaker),
      start_time: buffer[0].start,
      end_time: buffer[buffer.length - 1].end,
      text: buffer.map((w) => w.text).join(" "),
      sequence: lines.length,
    });
    buffer = [];
  };

  for (const word of words) {
    const prev = buffer[buffer.length - 1];
    const speakerChanged = prev !== undefined && prev.speaker !== word.speaker;
    const longPause = prev !== undefined && word.start - prev.end > MAX_PAUSE_SECONDS;
    if (speakerChanged || longPause) flush();

    buffer.push(word);
    if (SENTENCE_END_RE.test(word.text) || buffer.length >= MAX_WORDS_PER_LINE) flush();
  }
  flush();

  return lines;
}

export function concatenateUtterances(utterances: MappedUtterance[]): string {
  return utterances.map((u) => `[Konuşmacı ${u.speaker_label}] ${u.text}`).join("\n");
}
