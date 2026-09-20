"use client";

import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/components/audio-player";

interface Clip {
  id: string;
  start_time: number;
  end_time: number;
  title: string;
  summary: string;
}

function formatTimestamp(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ClipsList({ clips }: { clips: Clip[] }) {
  const player = useAudioPlayer();

  if (clips.length === 0) {
    return <p className="text-muted-foreground text-sm">Henüz klip oluşturulmadı.</p>;
  }

  return (
    <div className="space-y-3">
      {clips.map((clip) => (
        <div key={clip.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
          <div>
            <div className="text-muted-foreground font-mono text-xs">
              {formatTimestamp(clip.start_time)} – {formatTimestamp(clip.end_time)}
            </div>
            <div className="font-medium">{clip.title}</div>
            <div className="text-muted-foreground text-sm">{clip.summary}</div>
          </div>
          {player && (
            <Button size="sm" variant="outline" onClick={() => player.seek(clip.start_time)}>
              Oynat
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
