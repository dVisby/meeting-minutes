import type { ExportUtterance } from "./types";

export function toTxt(utterances: ExportUtterance[]): string {
  return utterances
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((u) => `[Konuşmacı ${u.speaker_label}] ${u.text}`)
    .join("\n");
}
