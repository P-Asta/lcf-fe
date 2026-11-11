import { Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Table, TBody, TD, TH, THead, TR, RankCell } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { PlayerLink } from "@/components/PlayerLink";
import { WornBadges } from "@/components/BadgeIcon";
import { RankBadge } from "@/components/RankBadge";
import { SearchField } from "@/components/SearchField";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { EmptyState, ErrorState } from "@/components/StateBlock";
import { Caption, Text } from "@/components/typography/Text";
import { Skeleton } from "@/components/ui/skeleton";
import { Stack } from "@/components/layout/Stack";
import { useLeaderboard } from "@/hooks/queries";
import type { LeaderboardEntry } from "@/lib/api";
import { fmtPct, fmtTr } from "@/lib/format";

type SortKey = "tr" | "wins" | "winrate" | "games";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "tr", label: "TR" },
  { value: "wins", label: "Wins" },
  { value: "winrate", label: "Win rate" },
  { value: "games", label: "Matches" },
];

const PAGE = 12;

const sorters: Record<SortKey, (a: LeaderboardEntry, b: LeaderboardEntry) => number> = {
  tr: (a, b) => a.position - b.position,
  wins: (a, b) => b.wins - a.wins || a.position - b.position,
  winrate: (a, b) => b.wins / Math.max(b.games, 1) - a.wins / Math.max(a.games, 1) || a.position - b.position,
  games: (a, b) => b.games - a.games || a.position - b.position,
};

export function LeaderboardPage() {
  const { data, error, isPending } = useLeaderboard();
  const [sort, setSort] = useState<SortKey>("tr");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (data?.entries ?? []).filter((e) => !q || e.name.toLowerCase().includes(q));
    return [...list].sort(sorters[sort]);
  }, [data, query, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages);
  const slice = rows.slice((current - 1) * PAGE, current * PAGE);

  return (
    <Stack gap={8}>
      <Stack gap={1}>
        <Text variant="headline" as="h1">
          League
        </Text>
        <Caption className="text-body">The ranked ladder: TR from rated 1v1 matches.</Caption>
      </Stack>
      <Stack direction="row" align="center" justify="between" gap={4} wrap>
        <SegmentedTabs
          label="Sort leaderboard"
          options={SORTS}
          value={sort}
          onChange={(s) => {
            setSort(s);
            setPage(1);
          }}
        />
        <SearchField
          value={query}
          onChange={(q) => {
            setQuery(q);
            setPage(1);
          }}
          placeholder="Find player by name"
        />
      </Stack>

      {error ? (
        <ErrorState error={error} />
      ) : isPending ? (
        <LeaderboardSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon={Trophy} title={query ? "No player matches that name" : "No ranked players yet"}>
          {query ? "Try a shorter part of the name." : "Players appear here after their first rated match."}
        </EmptyState>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH className="w-16" />
              <TH>Player</TH>
              <TH>TR</TH>
              <TH>Peak</TH>
              <TH>Matches</TH>
              <TH align="right">Win</TH>
            </tr>
          </THead>
          <TBody>
            {slice.map((e) => (
              <TR key={e.steam_id} interactive>
                <RankCell n={e.position} />
                <TD>
                  <span className="flex items-center gap-2">
                    <PlayerLink player={e} />
                    <WornBadges ids={e.worn} />
                    <RankBadge rank={e.rank} />
                  </span>
                </TD>
                <TD className="text-fg tabular-nums">{fmtTr(e.tr)}</TD>
                <TD className="text-muted tabular-nums">{fmtTr(e.peak_tr)}</TD>
                <TD className="text-fg tabular-nums">{e.games}</TD>
                <TD align="right" className="text-primary-300 tabular-nums">
                  {fmtPct(e.wins, e.games)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Pagination page={current} pages={pages} onChange={setPage} />
    </Stack>
  );
}

function LeaderboardSkeleton() {
  return (
    <Stack gap={1}>
      <Skeleton className="h-8 w-full bg-transparent" />
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-card" />
      ))}
    </Stack>
  );
}
