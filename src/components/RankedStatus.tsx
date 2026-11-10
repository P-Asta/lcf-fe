import { useLiveStats } from "@/hooks/queries";
import { cn } from "@/lib/utils";

/** Live ranked counts from the game server: players in the queue and in ranked matches. */
export function RankedStatus({ className }: { className?: string }) {
  const { data, isError } = useLiveStats();
  if (isError || !data) return null;
  const { searching, playing } = data.ranked;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Ranked: ${searching} searching, ${playing} playing`}
      className={cn("flex h-9 items-center gap-3 rounded-control bg-surface px-3 text-caption text-muted tabular-nums", className)}
    >
      <span className="flex items-center gap-2">
        <span aria-hidden className={cn("size-2 rounded-full", searching + playing > 0 ? "animate-pulse bg-primary-300" : "bg-line")} />
        <span className="font-medium text-fg">Ranked</span>
      </span>
      <span>
        <span className="text-fg">{searching}</span> searching
      </span>
      <span aria-hidden className="text-line">
        ·
      </span>
      <span>
        <span className="text-fg">{playing}</span> playing
      </span>
    </div>
  );
}
