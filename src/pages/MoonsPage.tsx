import { Moon } from "lucide-react";
import { useMemo, useState } from "react";
import { Table, TBody, TD, TH, THead, TR, RankCell } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { PlayerLink } from "@/components/PlayerLink";
import { SearchField } from "@/components/SearchField";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { StatCard, StatCardSkeleton } from "@/components/StatCard";
import { EmptyState, ErrorState } from "@/components/StateBlock";
import { Skeleton } from "@/components/ui/skeleton";
import { Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { useMoons } from "@/hooks/queries";
import type { MoonLeader } from "@/lib/api";
import { fmtDate, fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortKey = "best" | "total";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "best", label: "Best run" },
  { value: "total", label: "Total earned" },
];

const PAGE = 12;

const sorters: Record<SortKey, (a: MoonLeader, b: MoonLeader) => number> = {
  best: (a, b) => b.best - a.best || a.best_at - b.best_at,
  total: (a, b) => b.total - a.total || b.best - a.best,
};

export function MoonsPage() {
  const { data, error, isPending } = useMoons();
  const [picked, setPicked] = useState<string | undefined>();
  const [sort, setSort] = useState<SortKey>("best");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const moons = data?.moons ?? [];
  const board = moons.find((m) => m.moon === picked) ?? moons[0];

  // Positions follow the chosen sort over all players, so a search keeps each player's real place.
  const ranked = useMemo(() => [...(board?.leaders ?? [])].sort(sorters[sort]).map((l, i) => ({ ...l, position: i + 1 })), [board, sort]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? ranked.filter((l) => (l.name ?? "").toLowerCase().includes(q)) : ranked;
  }, [ranked, query]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages);
  const slice = rows.slice((current - 1) * PAGE, current * PAGE);

  const record = ranked.length ? [...ranked].sort(sorters.best)[0] : undefined;
  const earner = ranked.length ? [...ranked].sort(sorters.total)[0] : undefined;

  const reset = () => setPage(1);

  if (error) return <ErrorState error={error} />;

  if (!isPending && moons.length === 0) {
    return (
      <EmptyState icon={Moon} title="No ranked matches yet">
        Each moon gets its own earnings board after its first rated ranked match.
      </EmptyState>
    );
  }

  return (
    <Stack gap={8}>
      {isPending || !board ? (
        <Skeleton className="h-9 w-full max-w-2xl" />
      ) : (
        <SegmentedTabs
          label="Moon"
          options={moons.map((m) => ({ value: m.moon, label: m.moon }))}
          value={board.moon}
          onChange={(m) => {
            setPicked(m);
            reset();
          }}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {isPending || !board ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Moon record"
              accent
              value={record ? fmtMoney(record.best) : "-"}
              sub={record ? `${record.name ?? "Unknown"} · ${fmtDate(record.best_at)}` : "No runs yet"}
            />
            <StatCard
              label="Most earned"
              value={earner ? fmtMoney(earner.total) : "-"}
              sub={earner ? `${earner.name ?? "Unknown"} · ${earner.games} ${earner.games === 1 ? "match" : "matches"}` : "No runs yet"}
            />
            <StatCard
              label="Ranked matches"
              value={board.matches}
              sub={`${board.leaders.length} ${board.leaders.length === 1 ? "player has" : "players have"} landed on ${board.moon}`}
            />
          </>
        )}
      </div>

      <Section title={board ? `${board.moon} earnings` : "Earnings"} aside="Rated ranked matches only">
        <Stack gap={4}>
          <Stack direction="row" align="center" justify="between" gap={4} wrap>
            <SegmentedTabs
              label="Sort moon leaderboard"
              options={SORTS}
              value={sort}
              onChange={(s) => {
                setSort(s);
                reset();
              }}
            />
            <SearchField
              value={query}
              onChange={(q) => {
                setQuery(q);
                reset();
              }}
              placeholder="Find player by name"
            />
          </Stack>

          {isPending ? (
            <Stack gap={1}>
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-card" />
              ))}
            </Stack>
          ) : rows.length === 0 ? (
            <EmptyState icon={Moon} title="No player matches that name">
              Try a shorter part of the name.
            </EmptyState>
          ) : (
            <Table className="min-w-0 sm:min-w-xl">
              <THead>
                <tr>
                  <TH className="w-12 sm:w-16" />
                  <TH>Player</TH>
                  <TH align="right" className={sort === "best" ? "sm:text-left" : "hidden sm:table-cell sm:text-left"}>
                    Best run
                  </TH>
                  <TH align="right" className={sort === "total" ? "sm:text-left" : "hidden sm:table-cell sm:text-left"}>
                    Total earned
                  </TH>
                  <TH className="hidden sm:table-cell">Matches</TH>
                  <TH align="right" className="hidden sm:table-cell">
                    Best set
                  </TH>
                </tr>
              </THead>
              <TBody>
                {slice.map((l) => (
                  <TR key={l.steam_id} interactive>
                    <RankCell n={l.position} />
                    <TD>
                      <PlayerLink player={l} />
                    </TD>
                    <TD align="right" className={cn("tabular-nums sm:text-left", sort === "best" ? "text-primary-300" : "hidden text-fg sm:table-cell")}>
                      {fmtMoney(l.best)}
                    </TD>
                    <TD align="right" className={cn("tabular-nums sm:text-left", sort === "total" ? "text-primary-300" : "hidden text-fg sm:table-cell")}>
                      {fmtMoney(l.total)}
                    </TD>
                    <TD className="hidden text-fg tabular-nums sm:table-cell">{l.games}</TD>
                    <TD align="right" className="hidden text-muted tabular-nums sm:table-cell">
                      {fmtDate(l.best_at)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}

          <Pagination page={current} pages={pages} onChange={setPage} />
        </Stack>
      </Section>
    </Stack>
  );
}
