"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await signOutAction();
        router.push("/login");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Çıkış yapılamadı.");
      }
    });
  }

  return (
    <Button size="sm" variant="ghost" disabled={isPending} onClick={handleClick}>
      Çıkış Yap
    </Button>
  );
}
