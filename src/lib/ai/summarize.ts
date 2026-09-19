import "server-only";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { minutesGenerationSchema, type MinutesGeneration } from "@/shared/schemas";

const SYSTEM_PROMPT = `Sen bir toplantı asistanısın. Sana konuşmacı etiketleriyle (ör. "Konuşmacı 0") \
işaretlenmiş bir toplantı transkripti verilecek. Görevin bu transkripti Türkçe toplantı notu \
şablonuna uygun, yapılandırılmış bir özet haline getirmek. Katılımcı isimlerini yalnızca \
transkriptte açıkça geçiyorsa kullan; geçmiyorsa konuşmacı etiketlerini olduğu gibi bırak. \
Uydurma bilgi ekleme; transkriptte olmayan bir karar veya aksiyon üretme.`;

export async function generateMinutes(transcriptText: string): Promise<MinutesGeneration> {
  const result = await generateText({
    model: anthropic("claude-sonnet-5"),
    system: SYSTEM_PROMPT,
    prompt: `Aşağıdaki toplantı transkriptini yapılandırılmış toplantı notlarına dönüştür:\n\n${transcriptText}`,
    output: Output.object({
      schema: minutesGenerationSchema,
      name: "meeting_minutes",
      description: "Yapılandırılmış toplantı notları",
    }),
  });

  return result.output;
}
