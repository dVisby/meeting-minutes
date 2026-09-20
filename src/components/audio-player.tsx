"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface AudioPlayerContextValue {
  seek: (seconds: number) => void;
  getCurrentTime: () => number;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

/** Returns null when no audio is available for this meeting yet. */
export function useAudioPlayer() {
  return useContext(AudioPlayerContext);
}

/**
 * Renders the sticky audio bar (when the meeting has an uploaded audio file)
 * and provides `seek()` to descendants — transcript timestamps and clip
 * cards — via context, so they can jump the single <audio> element to a
 * point in the recording without prop-drilling through the server-rendered
 * meeting detail page.
 */
export function AudioPlayerProvider({
  meetingId,
  hasAudio,
  children,
}: {
  meetingId: string;
  hasAudio: boolean;
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAudio) return;
    let cancelled = false;
    fetch(`/api/meetings/${meetingId}/audio`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Ses dosyası yüklenemedi.");
        if (!cancelled) setUrl(data.url);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Ses dosyası yüklenemedi.");
      });
    return () => {
      cancelled = true;
    };
  }, [meetingId, hasAudio]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    void audio.play();
  }, []);

  const getCurrentTime = useCallback(() => audioRef.current?.currentTime ?? 0, []);

  return (
    <AudioPlayerContext.Provider value={hasAudio ? { seek, getCurrentTime } : null}>
      {hasAudio && (
        <div className="bg-card sticky top-4 z-10 rounded-md border p-3 shadow-sm">
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : (
            <audio ref={audioRef} controls src={url ?? undefined} className="w-full" preload="metadata" />
          )}
        </div>
      )}
      {children}
    </AudioPlayerContext.Provider>
  );
}
