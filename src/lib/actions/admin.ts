"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireUser, isAdminEmail, createServiceClient } from "@/lib/supabase/server";
import { encryptSecret, KNOWN_API_KEYS, type KnownApiKeyName } from "@/lib/secrets";

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) {
    throw new Error("Bu işlem için admin yetkisi gerekiyor.");
  }
  return user;
}

async function requestOrigin() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
}

/** Only path in that creates accounts — self-serve signup doesn't exist. */
export async function inviteUserAction(email: string) {
  await requireAdmin();
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    throw new Error("Geçerli bir e-posta girin.");
  }

  const origin = await requestOrigin();
  const supabase = createServiceClient();
  const { error } = await supabase.auth.admin.inviteUserByEmail(trimmed, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/set-password")}`,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}

export async function listInvitedUsers() {
  await requireAdmin();
  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw new Error(error.message);

  return data.users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "—",
      invitedAt: u.invited_at ?? u.created_at,
      hasSignedIn: Boolean(u.last_sign_in_at),
    }))
    .sort((a, b) => (a.invitedAt < b.invitedAt ? 1 : -1));
}

export async function updateApiCredentialAction(keyName: KnownApiKeyName, value: string) {
  const user = await requireAdmin();
  if (!KNOWN_API_KEYS.includes(keyName)) {
    throw new Error("Bilinmeyen anahtar.");
  }
  if (!value.trim()) {
    throw new Error("Değer boş olamaz.");
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("api_credentials").upsert({
    key_name: keyName,
    encrypted_value: encryptSecret(value.trim()),
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/api-keys");
}

export async function clearApiCredentialAction(keyName: KnownApiKeyName) {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from("api_credentials").delete().eq("key_name", keyName);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/api-keys");
}
