"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { mapSpeakerAction, createClipAction } from "@/lib/actions/meetings";
import { buildSpeakerNameMap, resolveSpeakerName } from "@/shared/speaker-name";
import { useAudioPlayer } from "@/components/audio-player";

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
  source: string;
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
  const player = useAudioPlayer();
  // Pre-fills the mapping inputs with Claude's speaker-name guesses (source
  // "ai_suggested") so confirming a name is a one-click edit-or-accept
  // instead of typing it from scratch; a manually confirmed name never gets
  // overwritten here since finalizeTranscript never touches "manual" rows.
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      participants
        .filter((p): p is Participant & { speaker_label: string } => Boolean(p.speaker_label))
        .map((p) => [p.speaker_label, p.name])
    )
  );
  const [clipStart, setClipStart] = useState("");
  const [clipEnd, setClipEnd] = useState("");

  const speakerNames = useMemo(() => buildSpeakerNameMap(participants), [participants]);
  const suggestedLabels = useMemo(
    () => new Set(participants.filter((p) => p.speaker_label && p.source === "ai_suggested").map((p) => p.speaker_label)),
    [participants]
  );

  const uniqueSpeakers = useMemo(
    () => Array.from(new Set(utterances.map((u) => u.speaker_label))),
    [utterances]
  );

  function displayName(speakerLabel: string) {
    return resolveSpeakerName(speakerLabel, speakerNames);
  }

  function handleMapSpeaker(speakerLabel: string) {
    const name = nameDrafts[speakerLabel]?.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        await mapSpeakerAction(meetingId, speakerLabel, name);
        toast.success(`${displayName(speakerLabel)} → ${name} olarak eşlendi.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "İsim kaydedilemedi.");
      }
    });
  }

  function handleCreateClip() {
    const start = Number(clipStart);
    const end = Number(clipEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    startTransition(async () => {
      try {
        await createClipAction(meetingId, start, end);
        setClipStart("");
        setClipEnd("");
        toast.success("Klip oluşturuldu.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Klip oluşturulamadı.");
      }
    });
  }

  if (utterances.length === 0) {
    return <p className="text-muted-foreground text-sm">Transkript henüz hazır değil.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-medium">Konuşmacılar</h3>
        <div className="flex flex-wrap items-center gap-2">
          {uniqueSpeakers.map((label) => (
            <Badge key={label} variant={suggestedLabels.has(label) ? "outline" : "secondary"}>
              {displayName(label)}
              {suggestedLabels.has(label) && " (AI önerisi)"}
            </Badge>
          ))}
          <Dialog>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>
              Konuşmacıları Düzenle
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Konuşmacıları Düzenle</DialogTitle>
                <DialogDescription>
                  Her konuşmacı etiketine gerçek bir isim atayın. AI önerileri onay bekliyor.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {uniqueSpeakers.map((label) => (
                  <div key={label} className="space-y-1.5">
                    <Label htmlFor={`speaker-${label}`}>
                      {displayName(label)}
                      {suggestedLabels.has(label) && (
                        <span className="text-primary ml-1 text-xs font-normal">
                          (AI önerisi, onaylayın)
                        </span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`speaker-${label}`}
                        placeholder="İsim"
                        value={nameDrafts[label] ?? ""}
                        onChange={(e) =>
                          setNameDrafts((prev) => ({ ...prev, [label]: e.target.value }))
                        }
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
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Zaman aralığından klip oluştur</h3>
        {player && (
          <p className="text-muted-foreground mb-2 text-xs">
            Sesi oynatın, doğru anda &quot;Başlangıcı İşaretle&quot; / &quot;Bitişi İşaretle&quot;ye tıklayın.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {player && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setClipStart(player.getCurrentTime().toFixed(1))}
              >
                Başlangıcı İşaretle
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setClipEnd(player.getCurrentTime().toFixed(1))}
              >
                Bitişi İşaretle
              </Button>
            </>
          )}
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
            {player ? (
              <button
                type="button"
                onClick={() => player.seek(u.start_time)}
                className="text-muted-foreground hover:text-primary font-mono text-xs hover:underline"
                title="Sesten bu noktadan oynat"
              >
                [{formatTimestamp(u.start_time)}]
              </button>
            ) : (
              <span className="text-muted-foreground font-mono text-xs">
                [{formatTimestamp(u.start_time)}]
              </span>
            )}{" "}
            <span className="font-medium">{displayName(u.speaker_label)}:</span> {u.text}
          </div>
        ))}
      </div>
    </div>
  );
}
