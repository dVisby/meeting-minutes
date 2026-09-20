import { NextResponse } from "next/server";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { isMeetingOwner } from "@/lib/meetings";
import { jsonError, notFound } from "@/lib/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!(await isMeetingOwner(id, user.id))) return notFound("Meeting");
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("utterances")
    .select("*")
    .eq("meeting_id", id)
    .order("sequence", { ascending: true });

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ utterances: data });
}
