import { memo } from "react";
import { RankBadge } from "@/components/RankBadge";
import { ErrorState } from "@/components/StateBlock";
import { Panel } from "@/components/layout/Section";
import { Caption, Text } from "@/components/typography/Text";
import { Skeleton } from "@/components/ui/skeleton";
import { useRanks } from "@/hooks/queries";
import type { RankIcon } from "@/lib/api";
import { fmtInt, fmtTr } from "@/lib/format";

const fmtTop = (top: number) => `Top ${top * 100 < 1 ? (top * 100).toFixed(1) : Math.round(top * 100)}%`;

const LadderRow = memo(function LadderRow({ rank }: { rank: RankIcon }) {
  const empty = rank.players === 0 || rank.min_tr == null;
  return (
    <li className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[2.5rem_1fr_7rem_6rem_8rem]">
      <RankBadge rank={rank.id} size="md" />
      <div className="flex min-w-0 flex-col">
        <Text variant="title" className="truncate">
          {rank.name}
        </Text>
        <Caption className="sm:hidden">
          {fmtTop(rank.top)} · {fmtInt(rank.players)} players
        </Caption>
      </div>
      <Caption className="hidden text-right tabular-nums sm:block">{fmtTop(rank.top)}</Caption>
      <Caption className="hidden text-right tabular-nums sm:block">{fmtInt(rank.players)} players</Caption>
      <Text variant="title" tone={empty ? "muted" : "default"} className="text-right tabular-nums">
        {empty ? "—" : `${fmtTr(rank.min_tr ?? 0)} TR`}
      </Text>
    </li>
  );
});

function LadderSkeleton() {
  return (
    <Panel>
      <ul aria-hidden className="flex flex-col">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[2.5rem_1fr_7rem_6rem_8rem]">
            <Skeleton className="size-10" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="hidden h-4 sm:block" />
            <Skeleton className="hidden h-4 sm:block" />
            <Skeleton className="h-6" />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function RankLadder() {
  const q = useRanks();
  if (q.error) return <ErrorState error={q.error} />;
  if (q.isPending) return <LadderSkeleton />;
  return (
    <Panel>
      <ul aria-label="Rank ladder" className="flex flex-col divide-y divide-bg">
        {q.data.ranks.map((r) => (
          <LadderRow key={r.id} rank={r} />
        ))}
      </ul>
    </Panel>
  );
}
