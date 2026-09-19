import { z } from "zod";

export const meetingStatusSchema = z.enum([
  "pending",
  "transcribing",
  "summarizing",
  "done",
  "failed",
]);
export type MeetingStatus = z.infer<typeof meetingStatusSchema>;

export const audioSourceSchema = z.enum(["upload", "mobile", "bot"]);
export type AudioSource = z.infer<typeof audioSourceSchema>;

/** Which backend a transcription model belongs to — drives dispatch in the process route. */
export const transcriptionProviderSchema = z.enum(["deepgram", "azure", "openai", "google"]);
export type TranscriptionProvider = z.infer<typeof transcriptionProviderSchema>;

/**
 * All selectable dikte (dictation) models across providers. Kept in sync
 * manually with each provider's docs:
 * - Deepgram: https://developers.deepgram.com/docs/models-languages-overview (Turkish support)
 * - Azure: https://learn.microsoft.com/azure/ai-services/speech-service/batch-transcription-create
 * - OpenAI: https://platform.openai.com/docs/guides/speech-to-text
 * - Google: https://ai.google.dev/gemini-api/docs/audio
 */
export const transcriptionModelSchema = z.enum([
  "nova-3",
  "nova-2",
  "base",
  "azure-speech",
  "whisper-1",
  "gemini-flash-latest",
]);
export type TranscriptionModel = z.infer<typeof transcriptionModelSchema>;

export interface TranscriptionModelOption {
  value: TranscriptionModel;
  provider: TranscriptionProvider;
  label: string;
  description: string;
  /** Whether this model separates speakers. Shown to set expectations before upload. */
  diarization: boolean;
  /** Hard upload-size ceiling for this model, enforced client-side before upload starts. */
  maxFileSizeMB?: number;
  /** Shown as an inline alert under the model picker when this option is selected. */
  warning?: string;
}

export const transcriptionModelOptions: TranscriptionModelOption[] = [
  {
    value: "nova-3",
    provider: "deepgram",
    label: "Deepgram Nova-3 (önerilen)",
    description: "En yeni ve en doğru Deepgram modeli, çok dilli konuşmalarda da güçlü.",
    diarization: true,
  },
  {
    value: "nova-2",
    provider: "deepgram",
    label: "Deepgram Nova-2",
    description: "Önceki nesil Deepgram modeli, hızlı ve dengeli.",
    diarization: true,
  },
  {
    value: "base",
    provider: "deepgram",
    label: "Deepgram Base",
    description: "Temel Deepgram modeli, en hafif seçenek.",
    diarization: true,
  },
  {
    value: "azure-speech",
    provider: "azure",
    label: "Azure AI Speech",
    description: "Microsoft Azure'ın toplu (batch) konuşma tanıma servisi.",
    diarization: true,
    warning:
      "Sonuç arka planda periyodik olarak kontrol edilir; Deepgram'a göre birkaç dakika daha geç tamamlanabilir.",
  },
  {
    value: "whisper-1",
    provider: "openai",
    label: "OpenAI Whisper",
    description: "OpenAI'ın konuşma tanıma modeli.",
    diarization: false,
    maxFileSizeMB: 25,
    warning: "Konuşmacı ayrımı yapmaz (tüm konuşma tek kişi gibi yazıya dökülür). Dosya boyutu en fazla 25MB olabilir.",
  },
  {
    value: "gemini-flash-latest",
    provider: "google",
    label: "Google Gemini",
    description: "Google'ın çok modlu (multimodal) yapay zeka modeli.",
    diarization: true,
    maxFileSizeMB: 20,
    warning:
      "Deneysel: konuşmacı ayrımı ve zaman damgaları yaklaşık olabilir, dedike konuşma tanıma modelleri kadar isabetli değildir. Dosya boyutu en fazla 20MB olabilir.",
  },
];

export const actionItemStatusSchema = z.enum(["open", "in_progress", "done"]);
export type ActionItemStatus = z.infer<typeof actionItemStatusSchema>;

export const utteranceSchema = z.object({
  id: z.string().optional(),
  speakerLabel: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  text: z.string(),
  sequence: z.number(),
});
export type Utterance = z.infer<typeof utteranceSchema>;

/** Structured output Claude must produce from a meeting transcript. */
export const minutesGenerationSchema = z.object({
  participants: z
    .array(z.string())
    .describe("Transkriptten tespit edilen katılımcı isimleri (konuşmacı etiketleri değil)."),
  speakerNameSuggestions: z
    .array(
      z.object({
        speakerLabel: z.string().describe("Transkriptteki 'Konuşmacı N' etiketindeki N değeri."),
        suggestedName: z
          .string()
          .nullable()
          .describe(
            "Bu konuşmacı etiketi için tahmin edilen gerçek isim (kendini tanıtma, birinin adıyla hitap edilmesi gibi ipuçlarından). Emin değilsen null bırak, uydurma isim üretme."
          ),
      })
    )
    .describe("Transkriptte geçen HER konuşmacı etiketi için bir isim tahmini (tahmin yoksa suggestedName null)."),
  meetingOwner: z.string().nullable().describe("Toplantı sahibi/yöneticisi, belirlenemiyorsa null."),
  agenda: z.array(z.string()).describe("Gündem maddeleri."),
  discussionTopics: z.array(z.string()).describe("Görüşülen konuların özeti, madde madde."),
  decisions: z.array(z.string()).describe("Alınan kararlar."),
  actionItems: z
    .array(
      z.object({
        description: z.string(),
        owner: z.string().nullable(),
        dueDate: z.string().nullable().describe("YYYY-MM-DD formatında, belirtilmemişse null."),
      })
    )
    .describe("Aksiyon maddeleri."),
  nextMeeting: z
    .object({
      date: z.string().nullable(),
      agenda: z.string().nullable(),
    })
    .nullable()
    .describe("Sonraki toplantı bilgisi, bahsedilmemişse null."),
  summary: z.string().describe("Toplantının 2-3 cümlelik kısa özeti."),
});
export type MinutesGeneration = z.infer<typeof minutesGenerationSchema>;

/** Structured output Claude must produce for a single soundbite/clip. */
export const clipSummarySchema = z.object({
  title: z.string().describe("Kısa, çarpıcı ('clickbait' tadında) başlık, en fazla 80 karakter."),
  summary: z.string().describe("Seçilen zaman aralığının 1-2 cümlelik özeti."),
});
export type ClipSummary = z.infer<typeof clipSummarySchema>;

export const exportFormatSchema = z.enum(["txt", "srt", "vtt", "md"]);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

export const createMeetingRequestSchema = z.object({
  title: z.string().min(1),
  meetingDate: z.string().nullable().optional(),
  audioSource: audioSourceSchema.optional().default("upload"),
  transcriptionModel: transcriptionModelSchema.optional().default("nova-3"),
});
export type CreateMeetingRequest = z.infer<typeof createMeetingRequestSchema>;

export const createAudioUploadUrlRequestSchema = z.object({
  fileName: z.string().min(1),
});
export type CreateAudioUploadUrlRequest = z.infer<typeof createAudioUploadUrlRequestSchema>;

export const confirmAudioUploadRequestSchema = z.object({
  path: z.string().min(1),
});
export type ConfirmAudioUploadRequest = z.infer<typeof confirmAudioUploadRequestSchema>;

export const createClipRequestSchema = z
  .object({
    startTime: z.number().nonnegative(),
    endTime: z.number().positive(),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "endTime must be greater than startTime",
  });
export type CreateClipRequest = z.infer<typeof createClipRequestSchema>;

export const mapSpeakerRequestSchema = z.object({
  speakerLabel: z.string().min(1),
  name: z.string().min(1),
});
export type MapSpeakerRequest = z.infer<typeof mapSpeakerRequestSchema>;

export const updateActionItemRequestSchema = z.object({
  status: actionItemStatusSchema.optional(),
  owner: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  description: z.string().optional(),
});
export type UpdateActionItemRequest = z.infer<typeof updateActionItemRequestSchema>;
