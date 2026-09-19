"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * Thin wrappers around the REST API (app/api/**) for web forms. All business
 * logic lives behind the API routes so a future mobile app can call the exact
 * same endpoints — these actions never touch the database directly.
 */
function apiBaseUrl() {
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

export async function createMeetingAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const meetingDate = String(formData.get("meetingDate") ?? "").trim();
  const file = formData.get("file");

  if (!title) throw new Error("Toplantı başlığı gerekli.");
  if (!(file instanceof File) || file.size === 0) throw new Error("Bir ses dosyası seçin.");

  const { meeting } = await apiFetch("/api/meetings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, meetingDate: meetingDate || null }),
  });

  const uploadForm = new FormData();
  uploadForm.set("file", file);
  await apiFetch(`/api/meetings/${meeting.id}/audio`, {
    method: "POST",
    body: uploadForm,
  });

  await apiFetch(`/api/meetings/${meeting.id}/process`, { method: "POST" });

  revalidatePath("/");
  redirect(`/meetings/${meeting.id}`);
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
