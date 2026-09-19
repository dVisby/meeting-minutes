import "server-only";
import type { MappedUtterance } from "@/lib/ai/diarize-map";

// v3.2's path-versioned API (not the newer `?api-version=2024-11-15` scheme)
// is what actually resolves on the regional `api.cognitive.microsoft.com`
// host without a custom-subdomain resource endpoint.
const API_BASE = "speechtotext/v3.2";

function getAzureConfig() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    throw new Error("Missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION environment variable.");
  }
  return { key, region };
}

function azureLocale() {
  // Azure wants a BCP-47 locale ("tr-TR"), not the bare language code ("tr")
  // the other providers accept via DEEPGRAM_LANGUAGE.
  const lang = process.env.DEEPGRAM_LANGUAGE ?? "tr";
  const knownLocales: Record<string, string> = { tr: "tr-TR", en: "en-US" };
  return knownLocales[lang] ?? "tr-TR";
}

/** Parses an ISO 8601 duration like "PT1M3.5S" into seconds. */
function parseIsoDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const match = /^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(iso);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}

interface AzureTranscriptionJob {
  self: string;
  status: "NotStarted" | "Running" | "Succeeded" | "Failed";
  properties?: { error?: { message?: string } };
  links?: { files?: string };
}

interface AzureTranscriptionFileList {
  values: Array<{
    kind: "Transcription" | "TranscriptionReport";
    links: { contentUrl: string };
  }>;
}

interface AzureRecognizedPhrase {
  recognitionStatus: string;
  speaker?: number;
  offset?: string;
  duration?: string;
  locale?: string;
  nBest?: Array<{ display: string }>;
}

interface AzureTranscriptionResult {
  durationMilliseconds?: number;
  recognizedPhrases?: AzureRecognizedPhrase[];
}

export async function startAzureTranscription(args: { audioUrl: string }): Promise<{ jobRef: string }> {
  const { key, region } = getAzureConfig();

  const res = await fetch(
    `https://${region}.api.cognitive.microsoft.com/${API_BASE}/transcriptions`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentUrls: [args.audioUrl],
        locale: azureLocale(),
        displayName: "meeting-minutes",
        properties: {
          diarizationEnabled: true,
          diarization: { speakers: { minCount: 1, maxCount: 10 } },
          punctuationMode: "DictatedAndAutomatic",
          wordLevelTimestampsEnabled: false,
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Azure transcription job could not be created (${res.status}): ${body}`);
  }

  const job = (await res.json()) as AzureTranscriptionJob;
  return { jobRef: job.self };
}

export type AzurePollResult =
  | { status: "running" }
  | { status: "failed"; error: string }
  | {
      status: "succeeded";
      utterances: MappedUtterance[];
      language: string | null;
      durationSeconds: number | null;
      rawResponse: unknown;
    };

/** Called from the polling cron route — Azure's batch API has no push callback. */
export async function pollAzureTranscription(jobRef: string): Promise<AzurePollResult> {
  const { key } = getAzureConfig();

  const statusRes = await fetch(jobRef, { headers: { "Ocp-Apim-Subscription-Key": key } });
  if (!statusRes.ok) {
    throw new Error(`Azure transcription status check failed (${statusRes.status}).`);
  }
  const job = (await statusRes.json()) as AzureTranscriptionJob;

  if (job.status === "NotStarted" || job.status === "Running") return { status: "running" };
  if (job.status === "Failed") {
    return { status: "failed", error: job.properties?.error?.message ?? "Azure transcription failed." };
  }

  if (!job.links?.files) throw new Error("Azure transcription succeeded but returned no files link.");
  const filesRes = await fetch(job.links.files, { headers: { "Ocp-Apim-Subscription-Key": key } });
  if (!filesRes.ok) throw new Error(`Azure transcription files fetch failed (${filesRes.status}).`);
  const files = (await filesRes.json()) as AzureTranscriptionFileList;

  const transcriptionFile = files.values.find((f) => f.kind === "Transcription");
  if (!transcriptionFile) throw new Error("Azure transcription succeeded but no result file was found.");

  const contentRes = await fetch(transcriptionFile.links.contentUrl);
  if (!contentRes.ok) throw new Error(`Azure transcription content fetch failed (${contentRes.status}).`);
  const content = (await contentRes.json()) as AzureTranscriptionResult;

  const phrases = content.recognizedPhrases ?? [];
  const utterances: MappedUtterance[] = phrases
    .filter((p) => p.recognitionStatus === "Success" && p.nBest?.[0]?.display)
    .map((p, index) => {
      const start = parseIsoDuration(p.offset);
      return {
        speaker_label: String(p.speaker ?? 0),
        start_time: start,
        end_time: start + parseIsoDuration(p.duration),
        text: (p.nBest?.[0]?.display ?? "").trim(),
        sequence: index,
      };
    });

  return {
    status: "succeeded",
    utterances,
    language: phrases[0]?.locale ?? null,
    durationSeconds: content.durationMilliseconds != null ? content.durationMilliseconds / 1000 : null,
    rawResponse: content,
  };
}
