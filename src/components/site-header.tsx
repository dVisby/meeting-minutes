import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createSessionClient, isAdminEmail } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Recapp
        </Link>
        <nav className="flex items-center gap-4">
          {user && (
            <>
              <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
                Toplantılar
              </Link>
              {isAdminEmail(user.email) && (
                <>
                  <Link href="/admin/users" className="text-muted-foreground hover:text-foreground text-sm">
                    Kullanıcılar
                  </Link>
                  <Link href="/admin/api-keys" className="text-muted-foreground hover:text-foreground text-sm">
                    Admin
                  </Link>
                </>
              )}
              <span className="text-muted-foreground hidden text-sm sm:inline">{user.email}</span>
              <SignOutButton />
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
