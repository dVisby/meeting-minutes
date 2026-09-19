import type { ExportActionItem, ExportMeeting, ExportMinutes } from "./types";

export function toMarkdown(
  meeting: ExportMeeting,
  minutes: ExportMinutes | null,
  actionItems: ExportActionItem[]
): string {
  const lines: string[] = [];
  lines.push(`# ${meeting.title}`);
  lines.push("");
  lines.push(`- **Tarih:** ${meeting.meeting_date ?? "—"}`);
  lines.push("");

  lines.push("## Gündem");
  lines.push("");
  if (minutes?.agenda.length) {
    for (const item of minutes.agenda) lines.push(`1. ${item}`);
  } else {
    lines.push("_Belirtilmemiş_");
  }
  lines.push("");

  lines.push("## Görüşülen Konular");
  lines.push("");
  if (minutes?.discussion.length) {
    for (const item of minutes.discussion) lines.push(`- ${item}`);
  } else {
    lines.push("_Belirtilmemiş_");
  }
  lines.push("");

  lines.push("## Alınan Kararlar");
  lines.push("");
  if (minutes?.decisions.length) {
    for (const item of minutes.decisions) lines.push(`- ${item}`);
  } else {
    lines.push("_Belirtilmemiş_");
  }
  lines.push("");

  lines.push("## Aksiyonlar");
  lines.push("");
  lines.push("| Aksiyon | Sorumlu | Son tarih | Durum |");
  lines.push("| --- | --- | --- | --- |");
  for (const item of actionItems) {
    lines.push(`| ${item.description} | ${item.owner ?? "—"} | ${item.due_date ?? "—"} | ${item.status} |`);
  }
  lines.push("");

  lines.push("## Sonraki Toplantı");
  lines.push("");
  lines.push(`- **Tarih:** ${minutes?.next_meeting?.date ?? "—"}`);
  lines.push(`- **Gündem:** ${minutes?.next_meeting?.agenda ?? "—"}`);

  return lines.join("\n");
}
