"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
              <Select
                key={item.status}
                defaultValue={item.status}
                disabled={isPending}
                onValueChange={(value) => {
                  const status = value as ActionItemStatus;
                  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
                  startTransition(async () => {
                    try {
                      await updateActionItemStatusAction(meetingId, item.id, status);
                      toast.success(`Durum "${label}" olarak güncellendi.`);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Durum güncellenemedi.");
                    }
                  });
                }}
              >
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
