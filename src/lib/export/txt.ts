import type { ExportUtterance } from "./types";

export function toTxt(utterances: ExportUtterance[]): string {
  return utterances
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((u) => `[${u.speaker_name}] ${u.text}`)
    .join("\n");
}
