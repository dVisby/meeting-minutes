-- Lets an admin override provider API keys from the app instead of only via
-- deployment env vars. Values are encrypted application-side (AES-256-GCM,
-- see src/lib/secrets.ts) before they ever reach the database — the key
-- that does that encryption/decryption lives only in CREDENTIALS_ENCRYPTION_KEY
-- (an env var), never in Postgres.

create table api_credentials (
  key_name text primary key,
  encrypted_value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- No permissive policies, same as every other table here: only the
-- server-only service-role key (used exclusively by the admin API-keys
-- route, itself gated on ADMIN_EMAILS) can read or write this table.
alter table api_credentials enable row level security;
