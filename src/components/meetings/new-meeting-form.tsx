"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transcriptionModelOptions, type TranscriptionModel } from "@/shared/schemas";

type Stage = "idle" | "creating" | "uploading" | "starting" | "error";

const stageLabel: Record<Exclude<Stage, "idle" | "error">, string> = {
  creating: "Toplantı oluşturuluyor…",
  uploading: "Ses dosyası yükleniyor…",
  starting: "Transkripsiyon başlatılıyor…",
};

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `İstek başarısız oldu (${res.status}).`);
  }
  return data;
}

/**
 * Uploads directly to the Supabase Storage signed URL so the file never has
 * to be relayed through our server, and reports real progress via XHR
 * (fetch has no reliable upload-progress event across browsers, esp. Safari).
 * Mirrors what supabase-js's `uploadToSignedUrl` sends on the wire.
 */
function uploadWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (percent: number) => void,
  xhrRef: React.MutableRefObject<XMLHttpRequest | null>
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Yükleme başarısız oldu (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Yükleme sırasında ağ hatası oluştu."));
    xhr.onabort = () => reject(new Error("Yükleme iptal edildi."));

    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", file);
    xhr.send(form);
  });
}

export function NewMeetingForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionModel, setTranscriptionModel] = useState<TranscriptionModel>("nova-3");
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const busy = stage === "creating" || stage === "uploading" || stage === "starting";
  const selectedModelOption = transcriptionModelOptions.find((o) => o.value === transcriptionModel);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const meetingDate = String(formData.get("meetingDate") ?? "").trim();
    const file = formData.get("file");

    if (!title) return setError("Toplantı başlığı gerekli.");
    if (!(file instanceof File) || file.size === 0) return setError("Bir ses dosyası seçin.");

    if (selectedModelOption?.maxFileSizeMB) {
      const maxBytes = selectedModelOption.maxFileSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        return setError(
          `${selectedModelOption.label} en fazla ${selectedModelOption.maxFileSizeMB}MB dosya kabul ediyor (seçilen dosya ${(file.size / (1024 * 1024)).toFixed(1)}MB). Daha küçük bir dosya seçin veya başka bir model kullanın.`
        );
      }
    }

    try {
      setStage("creating");
      const { meeting } = await postJson<{ meeting: { id: string } }>("/api/meetings", {
        title,
        meetingDate: meetingDate || null,
        transcriptionModel,
      });

      setStage("uploading");
      setProgress(0);
      const { path, signedUrl } = await postJson<{ path: string; signedUrl: string }>(
        `/api/meetings/${meeting.id}/audio/upload-url`,
        { fileName: file.name }
      );
      await uploadWithProgress(signedUrl, file, setProgress, xhrRef);
      await postJson(`/api/meetings/${meeting.id}/audio`, { path });

      setStage("starting");
      await postJson(`/api/meetings/${meeting.id}/process`);

      router.push(`/meetings/${meeting.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.");
      setStage("error");
    } finally {
      xhrRef.current = null;
    }
  }

  function handleCancel() {
    xhrRef.current?.abort();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Başlık</Label>
        <Input
          id="title"
          name="title"
          required
          disabled={busy}
          placeholder="Haftalık Ekip Toplantısı"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="meetingDate">Tarih</Label>
        <Input id="meetingDate" name="meetingDate" type="date" disabled={busy} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="transcriptionModel">Dikte modeli</Label>
        <Select
          value={transcriptionModel}
          onValueChange={(value) => setTranscriptionModel(value as TranscriptionModel)}
          disabled={busy}
        >
          <SelectTrigger id="transcriptionModel" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {transcriptionModelOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedModelOption && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">{selectedModelOption.description}</p>
            {selectedModelOption.maxFileSizeMB && (
              <p className="text-muted-foreground text-xs">
                Dosya boyutu sınırı: {selectedModelOption.maxFileSizeMB}MB.
              </p>
            )}
            {selectedModelOption.warning && (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                {selectedModelOption.warning}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">Ses dosyası (mp3, m4a, wav, aac, ogg, opus, webm, 3gp, amr, flac)</Label>
        <Input
          id="file"
          name="file"
          type="file"
          disabled={busy}
          accept="audio/*,video/3gpp,video/3gpp2,.mp3,.m4a,.wav,.aac,.ogg,.oga,.opus,.webm,.3gp,.3gpp,.amr,.flac,.mp4,audio/x-m4a,audio/mp4,audio/amr,audio/3gpp,audio/flac,audio/webm,audio/opus"
          required
        />
      </div>

      {stage === "uploading" && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-muted-foreground text-sm">Yükleniyor… %{progress}</p>
        </div>
      )}
      {(stage === "creating" || stage === "starting") && (
        <p className="text-muted-foreground text-sm">{stageLabel[stage]}</p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? "İşleniyor…" : "Yükle ve İşle"}
        </Button>
        {stage === "uploading" && (
          <Button type="button" variant="outline" onClick={handleCancel}>
            İptal
          </Button>
        )}
      </div>
    </form>
  );
}
