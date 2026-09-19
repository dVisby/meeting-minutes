"use client";

import { useEffect } from "react";
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

/**
 * While transcription/summarization is running server-side there's no
 * per-step progress to report (Deepgram + Claude are one opaque call each),
 * so instead of leaving the page static — which reads as frozen — we poll
 * for the meeting's status and refresh the server-rendered data as soon as
 * it changes, with a spinner so it's visibly still working in the meantime.
 */
export function MeetingStatusIndicator({ status }: { status: string }) {
  const router = useRouter();
  const isActive = ACTIVE_STATUSES.has(status);

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isActive, router]);

  return (
    <div className="flex flex-col items-end gap-1">
      <Badge variant={VARIANTS[status] ?? "outline"}>
        {isActive && <Loader2 className="animate-spin" data-icon="inline-start" />}
        {LABELS[status] ?? status}
      </Badge>
      {isActive && (
        <p className="text-muted-foreground text-xs">
          Birkaç dakika sürebilir, sayfa kendiliğinden güncellenecek.
        </p>
      )}
    </div>
  );
}
