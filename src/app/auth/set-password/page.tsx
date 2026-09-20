import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SetPasswordForm } from "@/components/auth/set-password-form";

/** Lands here right after an invite link establishes a session — first login completes signup by setting a password. */
export default async function SetPasswordPage() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Recapp&apos;e hoş geldiniz</CardTitle>
          <CardDescription>Devam etmeden önce bir şifre belirleyin ({user.email}).</CardDescription>
        </CardHeader>
        <CardContent>
          <SetPasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
