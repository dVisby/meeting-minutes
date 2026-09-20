import { notFound } from "next/navigation";
import { after } from "next/server";
import { FileText, Captions, Subtitles, FileCode } from "lucide-react";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { checkAzureMeetingStatus } from "@/lib/ai/check-azure-status";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { MeetingStatusIndicator } from "@/components/meetings/meeting-status-indicator";
import { ReprocessMeetingButton } from "@/components/meetings/reprocess-meeting-button";
import { DeleteMeetingButton } from "@/components/meetings/delete-meeting-button";
import { MinutesView } from "@/components/minutes-view";
import { ActionItemsTable } from "@/components/action-items-table";
import { TranscriptView } from "@/components/transcript-view";
import { ClipsList } from "@/components/clips-list";
import { AudioPlayerProvider } from "@/components/audio-player";
import { transcriptionModelLabel } from "@/shared/schemas";

export const dynamic = "force-dynamic";

const EXPORT_FORMATS = [
  { format: "txt", label: ".txt", icon: FileText, description: "Düz metin transkript" },
  {
    format: "srt",
    label: ".srt",
    icon: Captions,
    description: "Altyazı dosyası — video düzenleme yazılımlarında kullanılır",
  },
  {
    format: "vtt",
    label: ".vtt",
    icon: Subtitles,
    description: "Web altyazı dosyası — tarayıcı/video oynatıcılarda kullanılır",
  },
  {
    format: "md",
    label: ".md",
    icon: FileCode,
    description: "Markdown notlar — toplantı notları ve transkripti içerir",
  },
] as const;

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = createServiceClient();

  const [meetingRes, minutesRes, participantsRes, actionItemsRes, utterancesRes, clipsRes] =
    await Promise.all([
      supabase.from("meetings").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
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

  const actionItems = actionItemsRes.data ?? [];
  const clips = clipsRes.data ?? [];
  const openActionItems = actionItems.filter((a) => a.status !== "done").length;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{meeting.title}</h1>
          <p className="text-muted-foreground text-sm">
            {meeting.meeting_date ?? "Tarih yok"} · {transcriptionModelLabel(meeting.transcription_model)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MeetingStatusIndicator status={meeting.status} updatedAt={meeting.updated_at} />
          {(meeting.status === "failed" || meeting.status === "pending") && (
            <ReprocessMeetingButton meetingId={id} />
          )}
          <DeleteMeetingButton meetingId={id} title={meeting.title} redirectHome />
        </div>
      </div>

      {meeting.error_message && (
        <p className="text-destructive text-sm">Hata: {meeting.error_message}</p>
      )}

      <AudioPlayerProvider meetingId={id} hasAudio={Boolean(meeting.audio_path)}>
        <Tabs defaultValue="notlar">
          <TabsList>
            <TabsTab value="notlar">Notlar</TabsTab>
            <TabsTab value="aksiyonlar">
              Aksiyonlar{actionItems.length > 0 ? ` (${openActionItems})` : ""}
            </TabsTab>
            <TabsTab value="transkript">Transkript</TabsTab>
            <TabsTab value="klipler">Klipler{clips.length > 0 ? ` (${clips.length})` : ""}</TabsTab>
            <TabsTab value="disa-aktar">Dışa Aktar</TabsTab>
          </TabsList>

          <TabsPanel value="notlar">
            <Card>
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
          </TabsPanel>

          <TabsPanel value="aksiyonlar">
            <Card>
              <CardContent>
                <ActionItemsTable meetingId={id} actionItems={actionItems} />
              </CardContent>
            </Card>
          </TabsPanel>

          <TabsPanel value="transkript">
            <Card>
              <CardContent>
                <TranscriptView
                  meetingId={id}
                  utterances={utterancesRes.data ?? []}
                  participants={participantsRes.data ?? []}
                />
              </CardContent>
            </Card>
          </TabsPanel>

          <TabsPanel value="klipler">
            <Card>
              <CardContent>
                <ClipsList clips={clips} />
              </CardContent>
            </Card>
          </TabsPanel>

          <TabsPanel value="disa-aktar">
            <Card>
              <CardContent className="flex flex-wrap gap-2">
                <TooltipProvider>
                  {EXPORT_FORMATS.map(({ format, label, icon: Icon, description }) => (
                    <Tooltip key={format}>
                      <TooltipTrigger
                        render={
                          <Button
                            size="sm"
                            variant="outline"
                            render={<a href={`/api/meetings/${id}/export?format=${format}`} download />}
                            nativeButton={false}
                          />
                        }
                      >
                        <Icon />
                        {label}
                      </TooltipTrigger>
                      <TooltipContent>{description}</TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </CardContent>
            </Card>
          </TabsPanel>
        </Tabs>
      </AudioPlayerProvider>
    </main>
  );
}
