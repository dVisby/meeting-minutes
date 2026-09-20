import { redirect } from "next/navigation";
import { createSessionClient, isAdminEmail } from "@/lib/supabase/server";
import { listInvitedUsers } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InviteUserForm } from "@/components/admin/invite-user-form";

export default async function UsersAdminPage() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/");

  const users = await listInvitedUsers();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Kullanıcılar</h1>
        <p className="text-muted-foreground text-sm">
          Bu ortam davetle kullanılır — yeni hesap yalnızca burada davet edilerek açılır.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yeni davet</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Davet edilenler</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-posta</TableHead>
                <TableHead>Davet tarihi</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(u.invitedAt).toLocaleString("tr-TR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.hasSignedIn ? "default" : "outline"}>
                      {u.hasSignedIn ? "Aktif" : "Davet bekleniyor"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
