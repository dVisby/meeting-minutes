"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function HashSessionHandler({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        return "Giriş bağlantısı geçersiz veya süresi dolmuş.";
      }

      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) return error.message;

      router.replace(next);
      router.refresh();
      return null;
    }

    run().then(setError);
  }, [next, router]);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-10 text-center">
      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : (
        <p className="text-muted-foreground text-sm">Giriş yapılıyor…</p>
      )}
    </main>
  );
}
