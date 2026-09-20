"use server";

import { createSessionClient, requireUser } from "@/lib/supabase/server";

/**
 * Deliberately generic: whether the email doesn't exist, the account was
 * never invited, or the password is wrong, the visitor sees the same
 * message. Distinguishing those cases would let anyone probe which emails
 * have accounts in an invite-only environment.
 */
const LOGIN_ERROR =
  "Giriş bilgileri hatalı. Bu ortam yalnızca davetle kullanılır — hesabınız yoksa yöneticinizden davet isteyin.";

export async function signInWithPasswordAction(email: string, password: string) {
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(LOGIN_ERROR);
}

export async function signOutAction() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
}

/** Called from /auth/set-password once an invite link has established a session. */
export async function setPasswordAction(password: string) {
  if (password.length < 8) {
    throw new Error("Şifre en az 8 karakter olmalı.");
  }
  const supabase = await createSessionClient();
  await requireUser(); // throws if the invite session isn't valid/active
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
