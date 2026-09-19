-- Meeting Minutes: core schema (Phase 1)
-- meetings -> transcripts -> utterances (diarized, timestamped segments)
--          -> minutes + action_items (Claude-generated structured notes)
--          -> clips (soundbites over a time range)

create extension if not exists "pgcrypto";

create table meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null, -- reserved for future auth (Phase 2)
  title text not null,
  meeting_date date,
  audio_source text not null default 'upload', -- 'upload' | 'mobile' | 'bot'
  audio_path text,
  status text not null default 'pending', -- pending|transcribing|summarizing|done|failed
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  name text not null,
  speaker_label text -- maps a Deepgram speaker index (e.g. "0") to a human name
);
create index participants_meeting_id_idx on participants(meeting_id);

create table transcripts (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references meetings(id) on delete cascade,
  provider text not null default 'deepgram',
  raw_response jsonb,
  language text,
  duration_seconds numeric,
  created_at timestamptz not null default now()
);

create table utterances (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  transcript_id uuid not null references transcripts(id) on delete cascade,
  speaker_label text not null,
  start_time numeric not null,
  end_time numeric not null,
  text text not null,
  sequence int not null
);
create index utterances_meeting_sequence_idx on utterances(meeting_id, sequence);
create index utterances_meeting_start_idx on utterances(meeting_id, start_time);

create table minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references meetings(id) on delete cascade,
  agenda jsonb not null default '[]',
  discussion jsonb not null default '[]',
  decisions jsonb not null default '[]',
  next_meeting jsonb,
  raw_markdown text,
  generated_by text,
  created_at timestamptz not null default now()
);

create table action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  description text not null,
  owner text,
  due_date date,
  status text not null default 'open', -- open|in_progress|done
  created_at timestamptz not null default now()
);
create index action_items_meeting_id_idx on action_items(meeting_id);
create index action_items_status_idx on action_items(status);

create table clips (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  start_time numeric not null,
  end_time numeric not null,
  title text not null,
  summary text not null,
  audio_clip_path text, -- populated once audio cutting ships (v1.1)
  created_at timestamptz not null default now()
);
create index clips_meeting_id_idx on clips(meeting_id);

-- Phase 1 has no auth; the service-role key (server-only) bypasses RLS for all app access.
-- RLS is enabled with no permissive policies so the anon/public key cannot read or write directly.
alter table meetings enable row level security;
alter table participants enable row level security;
alter table transcripts enable row level security;
alter table utterances enable row level security;
alter table minutes enable row level security;
alter table action_items enable row level security;
alter table clips enable row level security;
