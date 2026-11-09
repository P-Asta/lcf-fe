import { CalendarX2, ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Table, TBody, TH, THead } from "@/components/DataTable";
import { MatchRow } from "@/components/MatchRow";
import { PlayerLink } from "@/components/PlayerLink";
import { SearchField } from "@/components/SearchField";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { StatCard, StatCardSkeleton } from "@/components/StatCard";
import { EmptyState, ErrorState } from "@/components/StateBlock";
import { Caption, Text } from "@/components/typography/Text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel, Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { useMatches } from "@/hooks/queries";
import type { Match, MatchSide } from "@/lib/api";
import { dayKey, fmtDate, fmtDay, fmtMoney, fmtMonth } from "@/lib/format";

type Day = { key: string; created: number; matches: Match[] };

const sides = (m: Match) => [m.p1, m.p2];

const matchesQuery = (m: Match, q: string) =>
  m.moon.toLowerCase().includes(q) || sides(m).some((s) => (s.name ?? "").toLowerCase().includes(q));

function monthHighlights(matches: Match[]) {
  let best: { side: MatchSide; match: Match } | null = null;
  const wins = new Map<string, { side: MatchSide; wins: number; last: number }>();
  const moons = new Map<string, number>();
  for (const m of matches) {
    for (const s of sides(m)) if (!best || s.score > best.side.score) best = { side: s, match: m };
    moons.set(m.moon, (moons.get(m.moon) ?? 0) + 1);
    const w = m.winner === 1 ? m.p1 : m.winner === 2 ? m.p2 : null;
    if (w) {
      const e = wins.get(w.steam_id) ?? { side: w, wins: 0, last: 0 };
      e.wins += 1;
      e.last = Math.max(e.last, m.created);
      wins.set(w.steam_id, e);
    }
  }
  const topWins = [...wins.values()].sort((a, b) => b.wins - a.wins || b.last - a.last)[0] ?? null;
  const topMoon = [...moons.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  return { best, topWins, topMoon };
}

function groupDays(matches: Match[]): Day[] {
  const days = new Map<string, Day>();
  for (const m of matches) {
    const k = dayKey(m.created);
    const d = days.get(k) ?? { key: k, created: m.created, matches: [] };
    d.matches.push(m);
    days.set(k, d);
  }
  return [...days.values()];
}

export function MatchesPage() {
  const [month, setMonth] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const { data, error, isPending } = useMatches(month);
  const activeMonth = month ?? data?.month ?? undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.matches ?? []).filter((m) => !q || matchesQuery(m, q));
  }, [data, query]);
  const days = useMemo(() => groupDays(filtered), [filtered]);
  const hl = useMemo(() => monthHighlights(filtered), [filtered]);
  const monthTabs = (data?.months ?? []).slice(0, 6).map((m) => ({ value: m.month, label: fmtMonth(m.month) }));

  return (
    <Stack gap={8}>
      <Stack direction="row" align="center" justify="between" gap={4} wrap>
        {monthTabs.length > 0 && activeMonth ? (
          <SegmentedTabs label="Month" options={monthTabs} value={activeMonth} onChange={setMonth} />
        ) : (
          <Skeleton className="h-9 w-80" />
        )}
        <SearchField value={query} onChange={setQuery} placeholder="Find match by player or moon" />
      </Stack>

      {error ? (
        <ErrorState error={error} />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {isPending ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  label="Highest ship value"
                  accent
                  value={hl.best ? fmtMoney(hl.best.side.score) : "-"}
                  sub={hl.best ? `${hl.best.side.name ?? "Unknown"} · ${hl.best.match.moon} · ${fmtDate(hl.best.match.created)}` : "No matches yet"}
                />
                <StatCard
                  label="Most wins"
                  value={hl.topWins ? `${hl.topWins.wins} ${hl.topWins.wins === 1 ? "win" : "wins"}` : "-"}
                  sub={hl.topWins ? `${hl.topWins.side.name ?? "Unknown"} · last win ${fmtDate(hl.topWins.last)}` : "No wins yet"}
                />
                <StatCard
                  label="Most played moon"
                  value={hl.topMoon ? hl.topMoon[0] : "-"}
                  sub={hl.topMoon ? `${hl.topMoon[1]} matches this month` : "No matches yet"}
                />
              </>
            )}
          </div>

          <Section title="Match log" aside={isPending ? null : `${days.length} match ${days.length === 1 ? "day" : "days"}`}>
            {isPending ? (
              <Stack gap={3}>
                {Array.from({ length: 3 }, (_, i) => (
                  <DaySkeleton key={i} />
                ))}
              </Stack>
            ) : days.length === 0 ? (
              <EmptyState icon={CalendarX2} title={query ? "No match fits that search" : "No matches this month"}>
                {query ? "Search by a player's name or a moon." : "Finished matches show up here as soon as they end."}
              </EmptyState>
            ) : (
              <Stack gap={3}>
                {days.map((d, i) => (
                  <DayCard key={d.key} day={d} latest={i === 0 && !query} />
                ))}
              </Stack>
            )}
          </Section>
        </>
      )}
    </Stack>
  );
}

function topValues(day: Day) {
  return day.matches
    .flatMap((m) => sides(m).map((s) => ({ side: s, match: m })))
    .sort((a, b) => b.side.score - a.side.score)
    .slice(0, 3);
}

function DayCard({ day, latest }: { day: Day; latest: boolean }) {
  const [open, setOpen] = useState(latest);
  const top = useMemo(() => topValues(day), [day]);
  const moons = new Set(day.matches.map((m) => m.moon)).size;
  const n = day.matches.length;
  const id = `day-${day.key}`;
  return (
    <Panel className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Text variant="title">{fmtDay(day.created)}</Text>
            {latest && <Badge tone="primary">Latest</Badge>}
          </div>
          <Caption className="text-body">
            {n} {n === 1 ? "match" : "matches"} · {moons} {moons === 1 ? "moon" : "moons"}
          </Caption>
        </div>
        <Button variant="secondary" size="sm" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
          {open ? `Hide ${n} ${n === 1 ? "match" : "matches"}` : `Show all ${n} ${n === 1 ? "match" : "matches"}`}
        </Button>
      </div>

      <ol className="grid gap-2 md:grid-cols-3" aria-label="Top ship values">
        {top.map((t, i) => (
          <li key={`${t.match.id}-${t.side.steam_id}`} className="flex h-11 items-center gap-3 rounded-control bg-surface-2 px-4">
            <span className="font-extrabold text-primary-400 tabular-nums">#{i + 1}</span>
            <PlayerLink player={t.side} className="flex-1" />
            <span className="text-fg tabular-nums">{fmtMoney(t.side.score)}</span>
            <Caption className="hidden lg:inline">{t.match.moon}</Caption>
          </li>
        ))}
      </ol>

      {open && (
        <div id={id}>
          <Table>
            <THead>
              <tr>
                <TH>Time</TH>
                <TH>Mode</TH>
                <TH>Moon</TH>
                <TH>Player 1</TH>
                <TH>Player 2</TH>
                <TH>Events</TH>
                <TH align="right">Decided by</TH>
              </tr>
            </THead>
            <TBody>
              {day.matches.map((m) => (
                <MatchRow key={m.id} match={m} inset />
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}

function DaySkeleton() {
  return (
    <Panel className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
      </div>
    </Panel>
  );
}
