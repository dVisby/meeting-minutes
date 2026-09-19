import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { concatenateUtterances, type MappedUtterance } from "@/lib/ai/diarize-map";
import { generateMinutes } from "@/lib/ai/summarize";
import type { TranscriptionProvider } from "@/shared/schemas";

/**
 * Takes over once any provider (Deepgram's webhook, or a synchronous/polled
 * call for Azure, OpenAI or Gemini) has produced a normalized transcript.
 * From here on the pipeline is identical regardless of which STT engine ran:
 * persist the transcript, ask Claude for structured minutes + per-speaker
 * name guesses, and store everything.
 */
export async function finalizeTranscript(params: {
  meetingId: string;
  provider: TranscriptionProvider;
  language: string | null;
  durationSeconds: number | null;
  rawResponse: unknown;
  utterances: MappedUtterance[];
}) {
  const { meetingId, provider, language, durationSeconds, rawResponse, utterances } = params;
  const supabase = createServiceClient();

  try {
    const { data: transcript, error: transcriptError } = await supabase
      .from("transcripts")
      .upsert(
        {
          meeting_id: meetingId,
          provider,
          raw_response: rawResponse,
          language,
          duration_seconds: durationSeconds,
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

    if (utterances.length > 0) {
      const { error: utterancesError } = await supabase.from("utterances").insert(
        utterances.map((u) => ({
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

    const transcriptText = concatenateUtterances(utterances);
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

    // Flat AI-guessed names (no speaker label attached) — replaced every run.
    const { error: deleteFlatParticipantsError } = await supabase
      .from("participants")
      .delete()
      .eq("meeting_id", meetingId)
      .is("speaker_label", null);
    if (deleteFlatParticipantsError) throw new Error(deleteFlatParticipantsError.message);

    if (generated.participants.length > 0) {
      const { error: participantsError } = await supabase.from("participants").insert(
        generated.participants.map((name) => ({ meeting_id: meetingId, name, source: "ai_suggested" }))
      );
      if (participantsError) throw new Error(participantsError.message);
    }

    // Per-speaker-label name suggestions: never overwrite a label the user
    // already confirmed manually, and refresh any previous AI guess for the
    // labels that are still unmapped (e.g. on a "Yeniden Dene" retry).
    const { data: manualRows, error: manualRowsError } = await supabase
      .from("participants")
      .select("speaker_label")
      .eq("meeting_id", meetingId)
      .eq("source", "manual")
      .not("speaker_label", "is", null);
    if (manualRowsError) throw new Error(manualRowsError.message);
    const manuallyMappedLabels = new Set((manualRows ?? []).map((p) => p.speaker_label));

    const { error: deleteSuggestedLabelsError } = await supabase
      .from("participants")
      .delete()
      .eq("meeting_id", meetingId)
      .eq("source", "ai_suggested")
      .not("speaker_label", "is", null);
    if (deleteSuggestedLabelsError) throw new Error(deleteSuggestedLabelsError.message);

    const labelSuggestions = generated.speakerNameSuggestions.filter(
      (s) => s.suggestedName && !manuallyMappedLabels.has(s.speakerLabel)
    );
    if (labelSuggestions.length > 0) {
      const { error: labelSuggestionsError } = await supabase.from("participants").insert(
        labelSuggestions.map((s) => ({
          meeting_id: meetingId,
          name: s.suggestedName as string,
          speaker_label: s.speakerLabel,
          source: "ai_suggested",
        }))
      );
      if (labelSuggestionsError) throw new Error(labelSuggestionsError.message);
    }

    await supabase
      .from("meetings")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", meetingId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to finalize transcript.";
    await supabase
      .from("meetings")
      .update({ status: "failed", error_message: message, updated_at: new Date().toISOString() })
      .eq("id", meetingId);
    throw err;
  }
}
