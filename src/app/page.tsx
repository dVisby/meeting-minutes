import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createServiceClient();
  const { data: meetings } = await supabase
    .from("meetings")
    .select("*, action_items(id, status)")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Toplantılar</h1>
        <Button render={<Link href="/meetings/new" />} nativeButton={false}>
          Yeni Toplantı
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tüm toplantılar</CardTitle>
        </CardHeader>
        <CardContent>
          {!meetings || meetings.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Henüz toplantı yok. Başlamak için &quot;Yeni Toplantı&quot;ya tıklayın.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Aksiyonlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetings.map((meeting) => {
                  const actionItems = (meeting.action_items ?? []) as { status: string }[];
                  const openCount = actionItems.filter((a) => a.status !== "done").length;
                  return (
                    <TableRow key={meeting.id}>
                      <TableCell>
                        <Link href={`/meetings/${meeting.id}`} className="font-medium hover:underline">
                          {meeting.title}
                        </Link>
                      </TableCell>
                      <TableCell>{meeting.meeting_date ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={meeting.status} />
                      </TableCell>
                      <TableCell>{openCount} açık</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
