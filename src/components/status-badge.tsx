import { cn } from "@/lib/utils";

export const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  transcribing: "Transkribe ediliyor",
  summarizing: "Özetleniyor",
  done: "Hazır",
  failed: "Hata",
};

const STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  transcribing: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  summarizing: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  done: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        STYLES[status] ?? STYLES.pending
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
