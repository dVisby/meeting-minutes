"use client";

import { useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateActionItemStatusAction } from "@/lib/actions/meetings";

type ActionItemStatus = "open" | "in_progress" | "done";

interface ActionItem {
  id: string;
  description: string;
  owner: string | null;
  due_date: string | null;
  status: string;
}

const STATUS_OPTIONS: Array<{ value: ActionItemStatus; label: string }> = [
  { value: "open", label: "Açık" },
  { value: "in_progress", label: "Devam ediyor" },
  { value: "done", label: "Tamamlandı" },
];

export function ActionItemsTable({
  meetingId,
  actionItems,
}: {
  meetingId: string;
  actionItems: ActionItem[];
}) {
  const [isPending, startTransition] = useTransition();

  if (actionItems.length === 0) {
    return <p className="text-muted-foreground text-sm">Aksiyon maddesi bulunamadı.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Aksiyon</TableHead>
          <TableHead>Sorumlu</TableHead>
          <TableHead>Son tarih</TableHead>
          <TableHead>Durum</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {actionItems.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.description}</TableCell>
            <TableCell>{item.owner ?? "—"}</TableCell>
            <TableCell>{item.due_date ?? "—"}</TableCell>
            <TableCell>
              <select
                defaultValue={item.status}
                disabled={isPending}
                onChange={(e) => {
                  const status = e.target.value as ActionItemStatus;
                  startTransition(() => {
                    updateActionItemStatusAction(meetingId, item.id, status);
                  });
                }}
                className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
