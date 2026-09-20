/**
 * Hand-written types matching supabase/migrations/0001_init.sql.
 * Once a real Supabase project is linked, regenerate with:
 *   supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 * (and reconcile any drift with this file's shape).
 */

export interface Database {
  public: {
    Tables: {
      meetings: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          meeting_date: string | null;
          audio_source: string;
          audio_path: string | null;
          status: string;
          error_message: string | null;
          transcription_model: string;
          transcription_job_ref: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          meeting_date?: string | null;
          audio_source?: string;
          audio_path?: string | null;
          status?: string;
          error_message?: string | null;
          transcription_model?: string;
          transcription_job_ref?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["meetings"]["Insert"]>;
      };
      participants: {
        Row: {
          id: string;
          meeting_id: string;
          name: string;
          speaker_label: string | null;
          source: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          name: string;
          speaker_label?: string | null;
          source?: string;
        };
        Update: Partial<Database["public"]["Tables"]["participants"]["Insert"]>;
      };
      transcripts: {
        Row: {
          id: string;
          meeting_id: string;
          provider: string;
          raw_response: unknown;
          language: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          provider?: string;
          raw_response?: unknown;
          language?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transcripts"]["Insert"]>;
      };
      utterances: {
        Row: {
          id: string;
          meeting_id: string;
          transcript_id: string;
          speaker_label: string;
          start_time: number;
          end_time: number;
          text: string;
          sequence: number;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          transcript_id: string;
          speaker_label: string;
          start_time: number;
          end_time: number;
          text: string;
          sequence: number;
        };
        Update: Partial<Database["public"]["Tables"]["utterances"]["Insert"]>;
      };
      minutes: {
        Row: {
          id: string;
          meeting_id: string;
          agenda: unknown;
          discussion: unknown;
          decisions: unknown;
          next_meeting: unknown;
          raw_markdown: string | null;
          generated_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          agenda?: unknown;
          discussion?: unknown;
          decisions?: unknown;
          next_meeting?: unknown;
          raw_markdown?: string | null;
          generated_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["minutes"]["Insert"]>;
      };
      action_items: {
        Row: {
          id: string;
          meeting_id: string;
          description: string;
          owner: string | null;
          due_date: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          description: string;
          owner?: string | null;
          due_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["action_items"]["Insert"]>;
      };
      clips: {
        Row: {
          id: string;
          meeting_id: string;
          start_time: number;
          end_time: number;
          title: string;
          summary: string;
          audio_clip_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          start_time: number;
          end_time: number;
          title: string;
          summary: string;
          audio_clip_path?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clips"]["Insert"]>;
      };
      api_credentials: {
        Row: {
          key_name: string;
          encrypted_value: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key_name: string;
          encrypted_value: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["api_credentials"]["Insert"]>;
      };
    };
  };
}
