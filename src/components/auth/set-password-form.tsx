"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPasswordAction } from "@/lib/actions/auth";

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    startTransition(async () => {
      try {
        await setPasswordAction(password);
        router.push("/");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Şifre kaydedilemedi.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Yeni şifre</Label>
        <Input
          id="password"
          type="password"
          required
          autoFocus
          disabled={isPending}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Şifre (tekrar)</Label>
        <Input
          id="confirm"
          type="password"
          required
          disabled={isPending}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Kaydediliyor…" : "Şifreyi Kaydet ve Devam Et"}
      </Button>
    </form>
  );
}
