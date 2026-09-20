import "server-only";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

/** The provider API keys an admin can override from the DB instead of only via env vars. */
export const KNOWN_API_KEYS = [
  "DEEPGRAM_API_KEY",
  "ANTHROPIC_API_KEY",
  "AZURE_SPEECH_KEY",
  "AZURE_SPEECH_REGION",
  "OPENAI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
] as const;
export type KnownApiKeyName = (typeof KNOWN_API_KEYS)[number];

const ALGORITHM = "aes-256-gcm";

/** SHA-256 of the passphrase so any length CREDENTIALS_ENCRYPTION_KEY becomes a valid 32-byte AES key. */
function encryptionKey() {
  const passphrase = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!passphrase) {
    throw new Error("Missing CREDENTIALS_ENCRYPTION_KEY environment variable.");
  }
  return crypto.createHash("sha256").update(passphrase).digest();
}

/** Returns `iv.authTag.ciphertext`, each base64, so the whole thing is one storable string. */
export function encryptSecret(plaintext: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(payload: string) {
  const [ivB64, authTagB64, ciphertextB64] = payload.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted credential.");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * Resolves a provider credential: an admin-set DB override takes precedence,
 * falling back to the deployment env var so nothing breaks for anyone who
 * hasn't touched the admin page.
 */
export async function getApiKey(name: KnownApiKeyName): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("api_credentials")
    .select("encrypted_value")
    .eq("key_name", name)
    .maybeSingle();

  const value = data ? decryptSecret(data.encrypted_value) : process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}: set it in the admin panel or as an environment variable.`);
  }
  return value;
}

/** All known keys with their current source (db override vs. env fallback) and a masked preview. */
export async function listApiKeyStatuses() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("api_credentials").select("key_name, updated_at");
  const overrides = new Map((data ?? []).map((row) => [row.key_name, row.updated_at]));

  return KNOWN_API_KEYS.map((name) => {
    const overriddenAt = overrides.get(name) ?? null;
    const envValue = process.env[name];
    return {
      name,
      source: overriddenAt ? ("database" as const) : envValue ? ("env" as const) : ("missing" as const),
      updatedAt: overriddenAt,
      masked: maskForDisplay(envValue, Boolean(overriddenAt)),
    };
  });
}

function maskForDisplay(envValue: string | undefined, hasDbOverride: boolean) {
  if (hasDbOverride) return "•••••••• (admin panelinden ayarlandı)";
  if (!envValue) return "— tanımlı değil —";
  if (envValue.length <= 8) return "••••••••";
  return `${envValue.slice(0, 4)}••••${envValue.slice(-4)}`;
}
