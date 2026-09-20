import Link from "next/link";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, STATUS_LABELS } from "@/components/status-badge";
import { DeleteMeetingButton } from "@/components/meetings/delete-meeting-button";
import { transcriptionModelLabel } from "@/shared/schemas";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q = "", status = "", page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const user = await requireUser();
  const supabase = createServiceClient();
  let query = supabase
    .from("meetings")
    .select("*, action_items(id, status)", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
  if (status) query = query.eq("status", status);

  const { data: meetings, count } = await query.range(from, to);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const hasFilters = Boolean(q.trim() || status);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
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
          <form className="mb-4 flex flex-wrap items-center gap-2" action="/">
            <Input
              name="q"
              defaultValue={q}
              placeholder="Başlıkta ara…"
              className="h-8 w-56"
            />
            <select
              name="status"
              defaultValue={status}
              className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
            >
              <option value="">Tüm durumlar</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="secondary">
              Filtrele
            </Button>
            {hasFilters && (
              <Button size="sm" variant="ghost" render={<Link href="/" />} nativeButton={false}>
                Temizle
              </Button>
            )}
          </form>

          {!meetings || meetings.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {hasFilters
                ? "Filtrelerle eşleşen toplantı bulunamadı."
                : 'Henüz toplantı yok. Başlamak için "Yeni Toplantı"ya tıklayın.'}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Başlık</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Aksiyonlar</TableHead>
                    <TableHead className="w-8" />
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
                        <TableCell className="text-muted-foreground text-sm">
                          {transcriptionModelLabel(meeting.transcription_model)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={meeting.status} />
                        </TableCell>
                        <TableCell>{openCount} açık</TableCell>
                        <TableCell>
                          <DeleteMeetingButton meetingId={meeting.id} title={meeting.title} iconOnly />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-muted-foreground text-xs">
                    Sayfa {page} / {totalPages} — toplam {count} toplantı
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      render={<Link href={pageHref(page - 1)} />}
                      nativeButton={false}
                    >
                      Önceki
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages}
                      render={<Link href={pageHref(page + 1)} />}
                      nativeButton={false}
                    >
                      Sonraki
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
