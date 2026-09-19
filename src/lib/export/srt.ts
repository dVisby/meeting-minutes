import { formatSrtTime } from "./time";
import type { ExportUtterance } from "./types";

export function toSrt(utterances: ExportUtterance[]): string {
  return utterances
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((u, index) => {
      const index1Based = index + 1;
      const start = formatSrtTime(u.start_time);
      const end = formatSrtTime(u.end_time);
      return `${index1Based}\n${start} --> ${end}\n[Konuşmacı ${u.speaker_label}] ${u.text}\n`;
    })
    .join("\n");
}
