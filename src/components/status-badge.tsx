import { Badge } from "@/components/ui/badge";

export const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  transcribing: "Transkribe ediliyor",
  summarizing: "Özetleniyor",
  done: "Hazır",
  failed: "Hata",
};

const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  transcribing: "secondary",
  summarizing: "secondary",
  done: "default",
  failed: "destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANTS[status] ?? "outline"}>{STATUS_LABELS[status] ?? status}</Badge>;
}
