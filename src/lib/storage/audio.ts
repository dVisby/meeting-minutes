import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "audio";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour, long enough for Deepgram to fetch and process

export function audioPathFor(meetingId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${meetingId}/${Date.now()}-${safeName}`;
}

export async function uploadMeetingAudio(path: string, file: Blob, contentType: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Failed to upload audio: ${error.message}`);
  }
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
