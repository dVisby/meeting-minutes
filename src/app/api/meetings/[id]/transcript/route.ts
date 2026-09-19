import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("utterances")
    .select("*")
    .eq("meeting_id", id)
    .order("sequence", { ascending: true });

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ utterances: data });
}
