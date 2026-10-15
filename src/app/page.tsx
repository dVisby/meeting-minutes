import Link from "next/link";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
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

  const [{ data: meetings, count }, { data: allMeetings }] = await Promise.all([
    query.range(from, to),
    supabase.from("meetings").select("status, action_items(status)").eq("user_id", user.id),
  ]);
  const all = (allMeetings ?? []) as { status: string; action_items: { status: string }[] | null }[];
  const stats = {
    total: all.length,
    processing: all.filter((m) => m.status === "transcribing" || m.status === "summarizing").length,
    openActions: all.reduce((n, m) => n + (m.action_items ?? []).filter((a) => a.status !== "done").length, 0),
    failed: all.filter((m) => m.status === "failed").length,
  };
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const hasFilters = Boolean(q.trim() || status);

  function pageHref(targetPage: number, nextStatus: string = status) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (nextStatus) params.set("status", nextStatus);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  const statCards = [
    { label: "Toplam toplantı", value: stats.total, hint: "Tüm kayıtlar", tone: "text-foreground" },
    { label: "İşleniyor", value: stats.processing, hint: "Transkripsiyon / özet", tone: "text-amber-600 dark:text-amber-400" },
    { label: "Açık aksiyon", value: stats.openActions, hint: "Tamamlanmamış maddeler", tone: "text-primary" },
    { label: "Hata", value: stats.failed, hint: "Yeniden işlenebilir", tone: "text-destructive" },
  ];
  const filters = [["", "Tümü"], ...Object.entries(STATUS_LABELS)];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Toplantılar</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Kayıtlarınızı transkribe edin, özetleyin ve aksiyonları takip edin.
          </p>
        </div>
        <Button size="lg" className="h-10 px-4" render={<Link href="/meetings/new" />} nativeButton={false}>
          <Plus /> Yeni Toplantı
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-card flex flex-col gap-2 rounded-2xl border p-5">
            <span className="text-muted-foreground text-[13px] font-medium">{s.label}</span>
            <span className={cn("text-3xl font-bold tabular-nums", s.tone)}>{s.value}</span>
            <span className="text-muted-foreground text-xs">{s.hint}</span>
          </div>
        ))}
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <form action="/" className="relative">
            {status && <input type="hidden" name="status" value={status} />}
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input name="q" defaultValue={q} placeholder="Başlıkta ara…" className="h-10 w-80 max-w-full pl-9" />
          </form>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Durum filtresi">
            {filters.map(([value, label]) => (
              <Link
                key={value || "all"}
                href={pageHref(1, value)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  status === value
                    ? "bg-foreground text-background border-transparent"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {!meetings || meetings.length === 0 ? (
          <p className="text-muted-foreground border-t px-5 py-12 text-center text-sm">
            {hasFilters
              ? "Filtrelerle eşleşen toplantı bulunamadı."
              : 'Henüz toplantı yok. Başlamak için "Yeni Toplantı"ya tıklayın.'}
          </p>
        ) : (
          <>
            <div className="text-muted-foreground bg-muted/50 hidden grid-cols-[1fr_120px_150px_190px_100px_40px] gap-4 border-t px-5 py-2.5 text-[11px] font-semibold tracking-wider uppercase md:grid">
              <span>Başlık</span>
              <span>Tarih</span>
              <span>Model</span>
              <span>Durum</span>
              <span>Aksiyonlar</span>
              <span />
            </div>
            <ul>
              {meetings.map((meeting) => {
                const actionItems = (meeting.action_items ?? []) as { status: string }[];
                const openCount = actionItems.filter((a) => a.status !== "done").length;
                return (
                  <li
                    key={meeting.id}
                    className="hover:bg-muted/40 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-t px-5 py-4 transition-colors md:grid-cols-[1fr_120px_150px_190px_100px_40px]"
                  >
                    <Link href={`/meetings/${meeting.id}`} className="truncate text-sm font-semibold hover:underline">
                      {meeting.title}
                    </Link>
                    <span className="text-muted-foreground text-sm">{meeting.meeting_date ?? "—"}</span>
                    <span className="text-muted-foreground truncate text-[13px]">
                      {transcriptionModelLabel(meeting.transcription_model)}
                    </span>
                    <StatusBadge status={meeting.status} />
                    <span className={cn("text-sm font-medium", openCount > 0 ? "text-primary" : "text-muted-foreground")}>
                      {openCount > 0 ? `${openCount} açık` : "—"}
                    </span>
                    <div className="justify-self-end">
                      <DeleteMeetingButton meetingId={meeting.id} title={meeting.title} iconOnly />
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between border-t px-5 py-3.5">
              <p className="text-muted-foreground text-[13px]">
                Sayfa {page} / {totalPages} — toplam {count} toplantı
              </p>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <Button variant="outline" disabled={page <= 1} render={<Link href={pageHref(page - 1)} />} nativeButton={false}>
                    Önceki
                  </Button>
                  <Button variant="outline" disabled={page >= totalPages} render={<Link href={pageHref(page + 1)} />} nativeButton={false}>
                    Sonraki
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
