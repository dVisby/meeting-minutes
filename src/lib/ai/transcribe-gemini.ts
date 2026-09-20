import "server-only";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { fetchAudioWithSizeLimit } from "@/lib/ai/fetch-audio";
import { getApiKey } from "@/lib/secrets";
import type { MappedUtterance } from "@/lib/ai/diarize-map";

// Gemini's inline (base64) request payload is capped well below its Files
// API limit; larger audio would need an upload-then-reference flow instead.
const MAX_BYTES = 20 * 1024 * 1024;

const geminiTranscriptSchema = z.object({
  language: z
    .string()
    .nullable()
    .describe("Algılanan dilin ISO 639-1 kodu (ör. 'tr'), belirlenemiyorsa null."),
  utterances: z.array(
    z.object({
      speakerLabel: z
        .string()
        .describe("Konuşmacı sırası için tutarlı bir etiket: '0', '1', '2'... Aynı kişi her konuştuğunda aynı etiketi kullan."),
      startSecond: z.number().describe("Sözün ses kaydındaki yaklaşık başlangıç saniyesi."),
      endSecond: z.number().describe("Sözün ses kaydındaki yaklaşık bitiş saniyesi."),
      text: z.string().describe("Söylenenin birebir (verbatim) yazıya dökümü."),
    })
  ),
});

const SYSTEM_PROMPT = `Sen bir konuşma tanıma ve konuşmacı ayırma (diarization) asistanısın. Sana bir toplantı \
ses kaydı verilecek. Görevlerin: (1) sesi mümkün olduğunca birebir yazıya dök, uydurma söz ekleme; \
(2) farklı konuşmacıları ayırt et ve her birine tutarlı bir etiket ver (aynı kişi her konuştuğunda aynı \
etiketi kullan); (3) her söz parçası için sesteki yaklaşık başlangıç/bitiş saniyesini ver. Zaman damgaları \
kesin olmak zorunda değil ama mümkün olduğunca isabetli olsun.`;

/**
 * Gemini has no dedicated diarized-ASR endpoint in this SDK version, so this
 * uses the general multimodal model with structured output instead of the
 * unified `transcribe()` helper — the tradeoff (called out to the user in
 * transcriptionModelOptions' warning) is approximate timestamps and no
 * guaranteed verbatim accuracy, unlike a dedicated ASR provider.
 */
export async function transcribeWithGemini(audioUrl: string): Promise<{
  utterances: MappedUtterance[];
  language: string | null;
}> {
  const { data, mediaType } = await fetchAudioWithSizeLimit(audioUrl, MAX_BYTES);
  const google = createGoogleGenerativeAI({ apiKey: await getApiKey("GOOGLE_GENERATIVE_AI_API_KEY") });

  const result = await generateObject({
    model: google("gemini-flash-latest"),
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Bu toplantı kaydını yazıya dök ve konuşmacılara ayır." },
          { type: "file", data, mediaType },
        ],
      },
    ],
    schema: geminiTranscriptSchema,
  });

  const utterances: MappedUtterance[] = result.object.utterances.map((u, index) => ({
    speaker_label: u.speakerLabel,
    start_time: u.startSecond,
    end_time: u.endSecond,
    text: u.text.trim(),
    sequence: index,
  }));

  return { utterances, language: result.object.language };
}
