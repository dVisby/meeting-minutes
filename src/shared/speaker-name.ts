/** Shared between the transcript UI and export routes so both resolve a Deepgram speaker label to a human name the same way. */
export function buildSpeakerNameMap(
  participants: Array<{ speaker_label: string | null; name: string }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of participants) {
    if (p.speaker_label) map.set(p.speaker_label, p.name);
  }
  return map;
}

export function resolveSpeakerName(speakerLabel: string, map: Map<string, string>): string {
  return map.get(speakerLabel) ?? `Konuşmacı ${speakerLabel}`;
}
