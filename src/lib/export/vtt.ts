import { formatVttTime } from "./time";
import type { ExportUtterance } from "./types";

export function toVtt(utterances: ExportUtterance[]): string {
  const cues = utterances
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((u) => {
      const start = formatVttTime(u.start_time);
      const end = formatVttTime(u.end_time);
      return `${start} --> ${end}\n[${u.speaker_name}] ${u.text}`;
    })
    .join("\n\n");

  return `WEBVTT\n\n${cues}\n`;
}
