import "server-only";

/**
 * Downloads audio for providers that need the raw bytes in-process (OpenAI,
 * Gemini), enforcing a size ceiling up front instead of letting the provider
 * reject an oversized upload with an opaque error.
 */
export async function fetchAudioWithSizeLimit(
  audioUrl: string,
  maxBytes: number
): Promise<{ data: Uint8Array; mediaType: string }> {
  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error(`Ses dosyası indirilemedi (${res.status}).`);

  const contentLength = Number(res.headers.get("content-length") ?? "0");
  const maxMB = Math.round(maxBytes / (1024 * 1024));
  if (contentLength > maxBytes) {
    await res.body?.cancel();
    throw new Error(`Ses dosyası ${maxMB}MB sınırını aşıyor (${(contentLength / (1024 * 1024)).toFixed(1)}MB).`);
  }

  const mediaType = res.headers.get("content-type") ?? "audio/mpeg";
  const data = new Uint8Array(await res.arrayBuffer());
  if (data.byteLength > maxBytes) {
    throw new Error(`Ses dosyası ${maxMB}MB sınırını aşıyor.`);
  }

  return { data, mediaType };
}
