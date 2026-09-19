import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  concatenateUtterances,
  mapDeepgramUtterances,
  type DeepgramCallbackPayload,
} from "@/lib/ai/diarize-map";
import { generateMinutes } from "@/lib/ai/summarize";
import { jsonError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const meetingId = request.nextUrl.searchParams.get("meetingId");
  if (!meetingId) return jsonError("Missing meetingId query parameter.");

  const payload = (await request.json().catch(() => null)) as DeepgramCallbackPayload | null;
  if (!payload?.results) return jsonError("Invalid Deepgram callback payload.");

  const supabase = createServiceClient();

  try {
    // Deepgram retries the callback if it doesn't get a timely response (our
    // handler can take a while due to the Claude summarization call below),
    // and "Yeniden Dene" re-runs this same flow for a meeting that was
    // already processed once. `transcripts`/`minutes` are unique per meeting,
    // so upsert them and replace the rows that depend on them instead of
    // inserting blindly, which previously failed with a duplicate-key error.
    const { data: transcript, error: transcriptError } = await supabase
      .from("transcripts")
      .upsert(
        {
          meeting_id: meetingId,
          provider: "deepgram",
          raw_response: payload,
          language: payload.metadata?.language ?? null,
          duration_seconds: payload.metadata?.duration ?? null,
        },
        { onConflict: "meeting_id" }
      )
      .select()
      .single();
    if (transcriptError) throw new Error(transcriptError.message);

    const { error: deleteUtterancesError } = await supabase
      .from("utterances")
      .delete()
      .eq("meeting_id", meetingId);
    if (deleteUtterancesError) throw new Error(deleteUtterancesError.message);

    const mappedUtterances = mapDeepgramUtterances(payload);
    if (mappedUtterances.length > 0) {
      const { error: utterancesError } = await supabase.from("utterances").insert(
        mappedUtterances.map((u) => ({
          meeting_id: meetingId,
          transcript_id: transcript.id,
          ...u,
        }))
      );
      if (utterancesError) throw new Error(utterancesError.message);
    }

    await supabase
      .from("meetings")
      .update({ status: "summarizing", updated_at: new Date().toISOString() })
      .eq("id", meetingId);

    const transcriptText = concatenateUtterances(mappedUtterances);
    const generated = await generateMinutes(transcriptText);

    const { error: minutesError } = await supabase.from("minutes").upsert(
      {
        meeting_id: meetingId,
        agenda: generated.agenda,
        discussion: generated.discussionTopics,
        decisions: generated.decisions,
        next_meeting: generated.nextMeeting,
        generated_by: "claude-sonnet-5",
      },
      { onConflict: "meeting_id" }
    );
    if (minutesError) throw new Error(minutesError.message);

    const { error: deleteActionItemsError } = await supabase
      .from("action_items")
      .delete()
      .eq("meeting_id", meetingId);
    if (deleteActionItemsError) throw new Error(deleteActionItemsError.message);

    if (generated.actionItems.length > 0) {
      const { error: actionItemsError } = await supabase.from("action_items").insert(
        generated.actionItems.map((item) => ({
          meeting_id: meetingId,
          description: item.description,
          owner: item.owner,
          due_date: item.dueDate,
          status: "open",
        }))
      );
      if (actionItemsError) throw new Error(actionItemsError.message);
    }

    // Only replace the AI-guessed participant names (speaker_label is null);
    // rows the user manually mapped to a Deepgram speaker label are kept.
    const { error: deleteParticipantsError } = await supabase
      .from("participants")
      .delete()
      .eq("meeting_id", meetingId)
      .is("speaker_label", null);
    if (deleteParticipantsError) throw new Error(deleteParticipantsError.message);

    if (generated.participants.length > 0) {
      const { error: participantsError } = await supabase.from("participants").insert(
        generated.participants.map((name) => ({ meeting_id: meetingId, name }))
      );
      if (participantsError) throw new Error(participantsError.message);
    }

    await supabase
      .from("meetings")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", meetingId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process transcription callback.";
    await supabase
      .from("meetings")
      .update({ status: "failed", error_message: message, updated_at: new Date().toISOString() })
      .eq("id", meetingId);
    return jsonError(message, 500);
  }
}
