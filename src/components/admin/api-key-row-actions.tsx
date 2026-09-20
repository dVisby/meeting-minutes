"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { updateApiCredentialAction, clearApiCredentialAction } from "@/lib/actions/admin";
import type { KnownApiKeyName } from "@/lib/secrets";

export function ApiKeyRowActions({
  keyName,
  hasDbOverride,
}: {
  keyName: KnownApiKeyName;
  hasDbOverride: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateApiCredentialAction(keyName, value);
        toast.success(`${keyName} güncellendi.`);
        setOpen(false);
        setValue("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Güncellenemedi.");
      }
    });
  }

  function handleClear() {
    startTransition(async () => {
      try {
        await clearApiCredentialAction(keyName);
        toast.success(`${keyName} için admin panel değeri kaldırıldı, .env değerine dönüldü.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sıfırlanamadı.");
      }
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button size="sm" variant="outline" />}>Düzenle</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{keyName}</DialogTitle>
            <DialogDescription>
              Yeni değer şifrelenerek kaydedilir ve bir sonraki API çağrısından itibaren kullanılır.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`value-${keyName}`}>Yeni değer</Label>
            <Input
              id={`value-${keyName}`}
              type="password"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Yeni anahtar değerini yapıştırın"
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Vazgeç</DialogClose>
            <Button disabled={isPending || !value.trim()} onClick={handleSave}>
              {isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {hasDbOverride && (
        <Button size="sm" variant="ghost" disabled={isPending} onClick={handleClear}>
          Sıfırla
        </Button>
      )}
    </div>
  );
}
