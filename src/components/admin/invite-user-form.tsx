"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteUserAction } from "@/lib/actions/admin";

export function InviteUserForm() {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await inviteUserAction(email);
        toast.success(`${email} davet edildi.`);
        setEmail("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Davet gönderilemedi.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        type="email"
        required
        placeholder="ad@sirket.com"
        value={email}
        disabled={isPending}
        onChange={(e) => setEmail(e.target.value)}
        className="h-8 w-64"
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Gönderiliyor…" : "Davet Gönder"}
      </Button>
    </form>
  );
}
