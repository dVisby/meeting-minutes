import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createMeetingRequestSchema } from "@/shared/schemas";
import { jsonError } from "@/lib/api-response";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*, action_items(id, status)")
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ meetings: data });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createMeetingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      title: parsed.data.title,
      meeting_date: parsed.data.meetingDate ?? null,
      audio_source: parsed.data.audioSource,
      status: "pending",
    })
    .select()
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ meeting: data }, { status: 201 });
}
