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
  if (clips.length === 0) {
    return <p className="text-muted-foreground text-sm">Henüz klip oluşturulmadı.</p>;
  }

  return (
    <div className="space-y-3">
      {clips.map((clip) => (
        <div key={clip.id} className="rounded-md border p-3">
          <div className="text-muted-foreground font-mono text-xs">
            {formatTimestamp(clip.start_time)} – {formatTimestamp(clip.end_time)}
          </div>
          <div className="font-medium">{clip.title}</div>
          <div className="text-muted-foreground text-sm">{clip.summary}</div>
        </div>
      ))}
    </div>
  );
}
