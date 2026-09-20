import "server-only";
import { generateText, Output } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { getApiKey } from "@/lib/secrets";
import { clipSummarySchema, type ClipSummary } from "@/shared/schemas";

const SYSTEM_PROMPT = `Sen bir toplantı klip/soundbite üreticisisin. Sana bir toplantının kısa bir \
bölümünün transkripti verilecek. Görevin bu bölüm için, tüm toplantıyı değil sadece bu bölümü \
yansıtan, dikkat çekici ("clickbait" tadında ama yanıltıcı olmayan) kısa bir başlık ve 1-2 \
cümlelik bir özet üretmek.`;

export async function generateClipSummary(segmentText: string): Promise<ClipSummary> {
  if (!segmentText.trim()) {
    throw new Error("Cannot generate a clip summary from an empty transcript segment.");
  }

  const anthropic = createAnthropic({ apiKey: await getApiKey("ANTHROPIC_API_KEY") });
  const result = await generateText({
    model: anthropic("claude-sonnet-5"),
    system: SYSTEM_PROMPT,
    prompt: `Bu zaman aralığının transkripti:\n\n${segmentText}`,
    output: Output.object({
      schema: clipSummarySchema,
      name: "clip_summary",
      description: "Kısa klip/soundbite başlığı ve özeti",
    }),
  });

  return result.output;
}
