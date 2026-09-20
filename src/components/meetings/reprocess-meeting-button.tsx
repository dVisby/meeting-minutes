"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reprocessMeetingAction } from "@/lib/actions/meetings";

export function ReprocessMeetingButton({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await reprocessMeetingAction(meetingId);
        toast.success("Transkripsiyon yeniden başlatıldı.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Yeniden başlatılamadı.");
      }
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={handleClick}>
      {isPending ? "Başlatılıyor…" : "Yeniden Dene"}
    </Button>
  );
}
