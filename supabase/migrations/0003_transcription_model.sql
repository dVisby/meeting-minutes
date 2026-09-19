-- Lets each meeting pick which Deepgram STT model transcribes its audio,
-- instead of the hardcoded "nova-2" in src/lib/ai/transcribe.ts.
alter table meetings
  add column transcription_model text not null default 'nova-3';
