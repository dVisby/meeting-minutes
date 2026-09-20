import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { exportFormatSchema } from "@/shared/schemas";
import { buildSpeakerNameMap, resolveSpeakerName } from "@/shared/speaker-name";
import { toTxt } from "@/lib/export/txt";
import { toSrt } from "@/lib/export/srt";
import { toVtt } from "@/lib/export/vtt";
import { toMarkdown } from "@/lib/export/markdown";
import { jsonError, notFound } from "@/lib/api-response";

const CONTENT_TYPES: Record<string, string> = {
  txt: "text/plain; charset=utf-8",
  srt: "application/x-subrip; charset=utf-8",
  vtt: "text/vtt; charset=utf-8",
  md: "text/markdown; charset=utf-8",
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formatParam = request.nextUrl.searchParams.get("format") ?? "txt";
  const parsedFormat = exportFormatSchema.safeParse(formatParam);
  if (!parsedFormat.success) {
    return jsonError(`Unsupported format. Use one of: txt, srt, vtt, md.`);
  }
  const format = parsedFormat.data;

  const user = await requireUser();
  const supabase = createServiceClient();
  const [meetingRes, utterancesRes, minutesRes, actionItemsRes, participantsRes] = await Promise.all([
    supabase.from("meetings").select("title, meeting_date").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("utterances").select("*").eq("meeting_id", id).order("sequence"),
    supabase.from("minutes").select("*").eq("meeting_id", id).maybeSingle(),
    supabase.from("action_items").select("*").eq("meeting_id", id),
    supabase.from("participants").select("speaker_label, name").eq("meeting_id", id),
  ]);

  if (meetingRes.error) return jsonError(meetingRes.error.message, 500);
  if (!meetingRes.data) return notFound("Meeting");

  const speakerNames = buildSpeakerNameMap(participantsRes.data ?? []);
  const utterances = (utterancesRes.data ?? []).map((u) => ({
    ...u,
    speaker_name: resolveSpeakerName(u.speaker_label, speakerNames),
  }));
  let body: string;

  switch (format) {
    case "txt":
      body = toTxt(utterances);
      break;
    case "srt":
      body = toSrt(utterances);
      break;
    case "vtt":
      body = toVtt(utterances);
      break;
    case "md":
      body = toMarkdown(
        meetingRes.data,
        minutesRes.data
          ? {
              agenda: (minutesRes.data.agenda as string[]) ?? [],
              discussion: (minutesRes.data.discussion as string[]) ?? [],
              decisions: (minutesRes.data.decisions as string[]) ?? [],
              next_meeting: minutesRes.data.next_meeting as {
                date: string | null;
                agenda: string | null;
              } | null,
            }
          : null,
        actionItemsRes.data ?? []
      );
      break;
  }

  const fileName = `${meetingRes.data.title.replace(/[^a-zA-Z0-9-_]/g, "_")}.${format}`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
