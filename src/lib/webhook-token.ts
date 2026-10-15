import "server-only";
import crypto from "crypto";

/**
 * Deepgram's callback is called by an external service with no user session, so
 * the only thing identifying the caller is the URL we gave it. Signing the
 * meeting id with a server-side secret makes that URL unforgeable: knowing (or
 * guessing) a meeting id is no longer enough to overwrite its transcript.
 *
 * The key is derived from CREDENTIALS_ENCRYPTION_KEY (already required for the
 * admin API-key panel) with a distinct label, so no new env var is needed and
 * the encryption key itself is never used directly as the HMAC key.
 */
function signingKey() {
  const passphrase = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!passphrase) {
    throw new Error("Missing CREDENTIALS_ENCRYPTION_KEY environment variable.");
  }
  return crypto.createHmac("sha256", passphrase).update("deepgram-webhook-v1").digest();
}

export function signMeetingId(meetingId: string) {
  return crypto.createHmac("sha256", signingKey()).update(meetingId).digest("hex");
}

export function verifyMeetingToken(meetingId: string, token: string | null) {
  if (!token) return false;
  const expected = Buffer.from(signMeetingId(meetingId));
  const actual = Buffer.from(token);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
