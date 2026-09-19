"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mapSpeakerAction, createClipAction } from "@/lib/actions/meetings";

interface Utterance {
  id: string;
  speaker_label: string;
  start_time: number;
  end_time: number;
  text: string;
  sequence: number;
}

interface Participant {
  speaker_label: string | null;
  name: string;
}

function formatTimestamp(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TranscriptView({
  meetingId,
  utterances,
  participants,
}: {
  meetingId: string;
  utterances: Utterance[];
  participants: Participant[];
}) {
  const [isPending, startTransition] = useTransition();
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [clipStart, setClipStart] = useState("");
  const [clipEnd, setClipEnd] = useState("");

  const speakerNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of participants) {
      if (p.speaker_label) map.set(p.speaker_label, p.name);
    }
    return map;
  }, [participants]);

  const uniqueSpeakers = useMemo(
    () => Array.from(new Set(utterances.map((u) => u.speaker_label))),
    [utterances]
  );

  function displayName(speakerLabel: string) {
    return speakerNames.get(speakerLabel) ?? `Konuşmacı ${speakerLabel}`;
  }

  function handleMapSpeaker(speakerLabel: string) {
    const name = nameDrafts[speakerLabel]?.trim();
    if (!name) return;
    startTransition(() => {
      mapSpeakerAction(meetingId, speakerLabel, name);
    });
  }

  function handleCreateClip() {
    const start = Number(clipStart);
    const end = Number(clipEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    startTransition(() => {
      createClipAction(meetingId, start, end);
      setClipStart("");
      setClipEnd("");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-medium">Konuşmacı eşleme</h3>
        <div className="flex flex-wrap gap-2">
          {uniqueSpeakers.map((label) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">{displayName(label)}:</span>
              <Input
                className="h-8 w-32"
                placeholder="İsim"
                value={nameDrafts[label] ?? ""}
                onChange={(e) => setNameDrafts((prev) => ({ ...prev, [label]: e.target.value }))}
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() => handleMapSpeaker(label)}
              >
                Eşle
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Zaman aralığından klip oluştur</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-8 w-28"
            type="number"
            placeholder="Başlangıç (sn)"
            value={clipStart}
            onChange={(e) => setClipStart(e.target.value)}
          />
          <Input
            className="h-8 w-28"
            type="number"
            placeholder="Bitiş (sn)"
            value={clipEnd}
            onChange={(e) => setClipEnd(e.target.value)}
          />
          <Button size="sm" disabled={isPending} onClick={handleCreateClip}>
            Klip Oluştur
          </Button>
        </div>
      </div>

      <div className="max-h-96 space-y-3 overflow-y-auto rounded-md border p-4">
        {utterances.map((u) => (
          <div key={u.id} className="text-sm">
            <span className="text-muted-foreground font-mono text-xs">
              [{formatTimestamp(u.start_time)}]
            </span>{" "}
            <span className="font-medium">{displayName(u.speaker_label)}:</span> {u.text}
          </div>
        ))}
      </div>
    </div>
  );
}
