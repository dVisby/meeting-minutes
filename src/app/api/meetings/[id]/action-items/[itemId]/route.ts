import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, requireUser } from "@/lib/supabase/server";
import { isMeetingOwner } from "@/lib/meetings";
import { updateActionItemRequestSchema } from "@/shared/schemas";
import { jsonError, notFound } from "@/lib/api-response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const user = await requireUser();
  if (!(await isMeetingOwner(id, user.id))) return notFound("Meeting");
  const body = await request.json().catch(() => null);
  const parsed = updateActionItemRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const { status, owner, dueDate, description } = parsed.data;
  const updatePayload: Record<string, string | null> = {};
  if (status !== undefined) updatePayload.status = status;
  if (owner !== undefined) updatePayload.owner = owner;
  if (dueDate !== undefined) updatePayload.due_date = dueDate;
  if (description !== undefined) updatePayload.description = description;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("action_items")
    .update(updatePayload)
    .eq("id", itemId)
    .eq("meeting_id", id)
    .select()
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!data) return notFound("Action item");
  return NextResponse.json({ actionItem: data });
}
