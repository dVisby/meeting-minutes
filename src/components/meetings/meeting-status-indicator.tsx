"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  pending: "Bekliyor",
  transcribing: "Transkribe ediliyor",
  summarizing: "Özetleniyor",
  done: "Hazır",
  failed: "Hata",
};

const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  transcribing: "secondary",
  summarizing: "secondary",
  done: "default",
  failed: "destructive",
};

const ACTIVE_STATUSES = new Set(["pending", "transcribing", "summarizing"]);
const POLL_INTERVAL_MS = 4000;
// Any real job (Deepgram/Azure/OpenAI/Gemini) updates `updated_at` well
// within this window; past it, polling forever and showing a spinner is
// just false hope — treat it as stuck and point at the retry/delete actions
// instead of pretending it's still in flight.
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

/**
 * While transcription/summarization is running server-side there's no
 * per-step progress to report (Deepgram + Claude are one opaque call each),
 * so instead of leaving the page static — which reads as frozen — we poll
 * for the meeting's status and refresh the server-rendered data as soon as
 * it changes, with a spinner so it's visibly still working in the meantime.
 */
export function MeetingStatusIndicator({ status, updatedAt }: { status: string; updatedAt: string }) {
  const router = useRouter();
  const isActive = ACTIVE_STATUSES.has(status);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const updatedAtMs = new Date(updatedAt).getTime();
    function tick() {
      const stale = Date.now() - updatedAtMs > STALE_THRESHOLD_MS;
      setIsStale(stale);
      if (!stale) router.refresh();
    }
    // Deferred rather than called synchronously here, so a meeting that's
    // already well past the threshold on mount settles into the "stuck"
    // state almost immediately instead of waiting a full poll interval.
    const timeoutId = setTimeout(tick, 0);
    const intervalId = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [isActive, updatedAt, router]);

  const isPolling = isActive && !isStale;

  return (
    <div className="flex flex-col items-end gap-1">
      <Badge variant={isStale ? "destructive" : (VARIANTS[status] ?? "outline")}>
        {isPolling && <Loader2 className="animate-spin" data-icon="inline-start" />}
        {LABELS[status] ?? status}
      </Badge>
      {isPolling && (
        <p className="text-muted-foreground text-xs">
          Birkaç dakika sürebilir, sayfa kendiliğinden güncellenecek.
        </p>
      )}
      {isStale && (
        <p className="text-muted-foreground text-xs">
          İşlem uzun süredir ilerlemiyor — yeniden deneyin veya silin.
        </p>
      )}
    </div>
  );
}
