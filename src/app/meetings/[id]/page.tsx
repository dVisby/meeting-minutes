import { notFound } from "next/navigation";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkAzureMeetingStatus } from "@/lib/ai/check-azure-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MeetingStatusIndicator } from "@/components/meetings/meeting-status-indicator";
import { MinutesView } from "@/components/minutes-view";
import { ActionItemsTable } from "@/components/action-items-table";
import { TranscriptView } from "@/components/transcript-view";
import { ClipsList } from "@/components/clips-list";
import { reprocessMeetingAction } from "@/lib/actions/meetings";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [meetingRes, minutesRes, participantsRes, actionItemsRes, utterancesRes, clipsRes] =
    await Promise.all([
      supabase.from("meetings").select("*").eq("id", id).maybeSingle(),
      supabase.from("minutes").select("*").eq("meeting_id", id).maybeSingle(),
      supabase.from("participants").select("*").eq("meeting_id", id),
      supabase.from("action_items").select("*").eq("meeting_id", id).order("created_at"),
      supabase.from("utterances").select("*").eq("meeting_id", id).order("sequence"),
      supabase.from("clips").select("*").eq("meeting_id", id).order("created_at", { ascending: false }),
    ]);

  if (!meetingRes.data) notFound();
  const meeting = meetingRes.data;

  // Azure's batch API has no push callback (unlike Deepgram's webhook), so
  // this page's every-4s auto-refresh (MeetingStatusIndicator) doubles as an
  // on-demand status check — anyone watching the page gets a near-real-time
  // result instead of waiting for the once-a-day cron (see poll-transcriptions).
  if (meeting.status === "transcribing" && meeting.transcription_model === "azure-speech" && meeting.transcription_job_ref) {
    const jobRef = meeting.transcription_job_ref;
    after(() => checkAzureMeetingStatus(id, jobRef));
  }

  const reprocess = reprocessMeetingAction.bind(null, id);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{meeting.title}</h1>
          <p className="text-muted-foreground text-sm">{meeting.meeting_date ?? "Tarih yok"}</p>
        </div>
        <div className="flex items-center gap-2">
          <MeetingStatusIndicator status={meeting.status} />
          {meeting.status === "failed" && (
            <form action={reprocess}>
              <Button size="sm" variant="outline" type="submit">
                Yeniden Dene
              </Button>
            </form>
          )}
        </div>
      </div>

      {meeting.error_message && (
        <p className="text-destructive text-sm">Hata: {meeting.error_message}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Toplantı Notları</CardTitle>
        </CardHeader>
        <CardContent>
          <MinutesView
            minutes={
              minutesRes.data
                ? {
                    agenda: (minutesRes.data.agenda as string[]) ?? [],
                    discussion: (minutesRes.data.discussion as string[]) ?? [],
                    decisions: (minutesRes.data.decisions as string[]) ?? [],
                    next_meeting: minutesRes.data.next_meeting as {
                      date: string | null;
                      agenda: string | null;
                    } | null,
                  }
                : null
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aksiyon Maddeleri</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionItemsTable meetingId={id} actionItems={actionItemsRes.data ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transkript</CardTitle>
        </CardHeader>
        <CardContent>
          <TranscriptView
            meetingId={id}
            utterances={utterancesRes.data ?? []}
            participants={participantsRes.data ?? []}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Klipler / Soundbite&apos;lar</CardTitle>
        </CardHeader>
        <CardContent>
          <ClipsList clips={clipsRes.data ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dışa Aktar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(["txt", "srt", "vtt", "md"] as const).map((format) => (
            <Button
              key={format}
              size="sm"
              variant="outline"
              render={<a href={`/api/meetings/${id}/export?format=${format}`} download />}
              nativeButton={false}
            >
              .{format}
            </Button>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
