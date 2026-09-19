-- Adds support for transcription providers beyond Deepgram (Azure AI Speech,
-- OpenAI Whisper, Google Gemini) and for AI-suggested (vs. user-confirmed)
-- speaker names.

-- Azure's batch transcription API has no push-callback like Deepgram's; we
-- poll its job status via a cron job, so we need somewhere to remember the
-- in-flight job reference between "process" kicking it off and the poller
-- picking it up.
alter table meetings
  add column transcription_job_ref text;

-- Distinguishes a name the user typed/confirmed from one Claude guessed from
-- transcript context (self-introductions, being addressed by name, etc.), so
-- a retry's fresh AI guesses never clobber a user's manual mapping.
alter table participants
  add column source text not null default 'manual';

alter table participants
  add constraint participants_source_check check (source in ('manual', 'ai_suggested'));
