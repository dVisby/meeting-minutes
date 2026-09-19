"use server";

import { revalidatePath } from "next/cache";

/**
 * Thin wrappers around the REST API (app/api/**) for web forms. All business
 * logic lives behind the API routes so a future mobile app can call the exact
 * same endpoints — these actions never touch the database directly.
 */
function apiBaseUrl() {
  // These actions call our own API routes in the same server process, so
  // they should always hit it directly. APP_URL is reserved for the public
  // address Deepgram's webhook calls back to — in local dev that's an https
  // tunnel, which has no uptime guarantee and shouldn't be on the hot path
  // for in-app requests (a flaky tunnel would otherwise silently fail
  // actions like mapping a speaker name).
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return process.env.APP_URL ?? "http://localhost:3000";
}

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request to ${path} failed with ${res.status}`);
  }
  return res.json();
}

export async function mapSpeakerAction(meetingId: string, speakerLabel: string, name: string) {
  await apiFetch(`/api/meetings/${meetingId}/participants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speakerLabel, name }),
  });
  revalidatePath(`/meetings/${meetingId}`);
}

export async function createClipAction(meetingId: string, startTime: number, endTime: number) {
  await apiFetch(`/api/meetings/${meetingId}/clips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startTime, endTime }),
  });
  revalidatePath(`/meetings/${meetingId}`);
}

export async function updateActionItemStatusAction(
  meetingId: string,
  itemId: string,
  status: "open" | "in_progress" | "done"
) {
  await apiFetch(`/api/meetings/${meetingId}/action-items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  revalidatePath(`/meetings/${meetingId}`);
}

export async function reprocessMeetingAction(meetingId: string) {
  await apiFetch(`/api/meetings/${meetingId}/process`, { method: "POST" });
  revalidatePath(`/meetings/${meetingId}`);
}
