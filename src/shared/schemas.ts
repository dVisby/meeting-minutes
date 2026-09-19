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
