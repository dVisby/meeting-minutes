import { redirect } from "next/navigation";
import { createSessionClient, isAdminEmail } from "@/lib/supabase/server";
import { listApiKeyStatuses } from "@/lib/secrets";
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
import { ApiKeyRowActions } from "@/components/admin/api-key-row-actions";

const SOURCE_LABELS: Record<string, string> = {
  database: "Admin panelinden ayarlandı",
  env: "Ortam değişkeninden (.env)",
  missing: "Tanımlı değil",
};

const SOURCE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  database: "default",
  env: "secondary",
  missing: "destructive",
};

export default async function ApiKeysAdminPage() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/");

  const keys = await listApiKeyStatuses();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">API Anahtarları</h1>
        <p className="text-muted-foreground text-sm">
          Sağlayıcı anahtarlarını buradan değiştirmek, deploy ortam değişkenlerini geçersiz kılar.
          Değerler şifreli saklanır.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sağlayıcı anahtarları</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anahtar</TableHead>
                <TableHead>Değer</TableHead>
                <TableHead>Kaynak</TableHead>
                <TableHead>Güncellenme</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.name}>
                  <TableCell className="font-mono text-xs">{k.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{k.masked}</TableCell>
                  <TableCell>
                    <Badge variant={SOURCE_VARIANTS[k.source]}>{SOURCE_LABELS[k.source]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {k.updatedAt ? new Date(k.updatedAt).toLocaleString("tr-TR") : "—"}
                  </TableCell>
                  <TableCell>
                    <ApiKeyRowActions keyName={k.name} hasDbOverride={k.source === "database"} />
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
