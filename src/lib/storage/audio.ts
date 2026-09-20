import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "audio";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour, long enough for Deepgram to fetch and process

export function audioPathFor(meetingId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${meetingId}/${Date.now()}-${safeName}`;
}

/**
 * Returns a short-lived signed URL the browser can upload the audio file to
 * directly, bypassing our server entirely so large files don't have to pass
 * through a Next.js function twice (and so the browser gets real upload
 * progress instead of hanging on one opaque request).
 */
export async function createAudioUploadTarget(meetingId: string, fileName: string) {
  const path = audioPathFor(meetingId, fileName);
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    throw new Error(`Failed to create signed upload URL: ${error?.message}`);
  }
  return { path, signedUrl: data.signedUrl, token: data.token };
}

/** Deepgram's prerecorded API fetches audio by URL, so we hand it a short-lived signed URL. */
export async function getSignedAudioUrl(path: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    throw new Error(`Failed to create signed URL: ${error?.message}`);
  }
  return data.signedUrl;
}

/** Removes an uploaded audio file, e.g. when its meeting is deleted. */
export async function deleteAudioFile(path: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    throw new Error(`Failed to delete audio file: ${error.message}`);
  }
}
