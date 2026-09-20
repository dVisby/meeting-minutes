"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteMeetingAction } from "@/lib/actions/meetings";

export function DeleteMeetingButton({
  meetingId,
  title,
  redirectHome = false,
  iconOnly = false,
}: {
  meetingId: string;
  title: string;
  /** True on the meeting detail page, where deleting leaves the page dead and we must navigate away. */
  redirectHome?: boolean;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteMeetingAction(meetingId);
        setOpen(false);
        toast.success(`"${title}" silindi.`);
        if (redirectHome) router.push("/");
        else router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Toplantı silinemedi.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size={iconOnly ? "icon-sm" : "sm"} variant="ghost" />}
        aria-label="Toplantıyı sil"
      >
        <Trash2 />
        {!iconOnly && "Sil"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Toplantıyı sil</DialogTitle>
          <DialogDescription>
            &quot;{title}&quot; kalıcı olarak silinecek — transkript, notlar, aksiyon maddeleri,
            klipler ve ses dosyası dahil. Bu işlem geri alınamaz.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Vazgeç</DialogClose>
          <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
            {isPending ? "Siliniyor…" : "Sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
