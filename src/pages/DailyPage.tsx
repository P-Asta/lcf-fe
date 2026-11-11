import { CalendarClock, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Table, TBody, TD, TH, THead, TR, RankCell } from "@/components/DataTable";
import { PlayerLink } from "@/components/PlayerLink";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { EmptyState, ErrorState } from "@/components/StateBlock";
import { StatCard, StatCardSkeleton } from "@/components/StatCard";
import { Stack } from "@/components/layout/Stack";
import { Section } from "@/components/layout/Section";
import { Caption, Text } from "@/components/typography/Text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDaily } from "@/hooks/queries";
import type { DailyRow } from "@/lib/api";
import { eventLabel, fmtCountdown, fmtMoney, toolLabel } from "@/lib/format";

type Board = "first" | "best";

const selectCls =
  "h-9 cursor-pointer rounded-pill bg-surface px-4 text-body text-fg tabular-nums outline-none transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary-400";

/** Counts down between refreshes from the server's "seconds left". */
function useCountdown(seconds: number | undefined, at: number) {
  const [left, setLeft] = useState(seconds ?? 0);
  useEffect(() => {
    if (seconds == null) return;
    const tick = () => setLeft(Math.max(0, seconds - Math.floor((Date.now() - at) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [seconds, at]);
  return left;
}

function BoardTable({ rows, live }: { rows: DailyRow[]; live: boolean }) {
  if (rows.length === 0) return <EmptyState icon={Trophy} title={live ? "No runs yet today" : "Nobody ran this challenge"} />;
  return (
    <Table>
      <THead>
        <tr>
          <TH>#</TH>
          <TH>Player</TH>
          <TH align="right">Ship value</TH>
        </tr>
      </THead>
      <TBody>
        {rows.map((r) => (
          <TR key={r.steam_id} interactive>
            <RankCell n={r.place} />
            <TD>
              <PlayerLink player={{ steam_id: r.steam_id, name: r.name, avatar: r.avatar }} />
            </TD>
            <TD align="right" className="text-primary-300 tabular-nums">
              {fmtMoney(r.score)}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

/** Daily race: every day's challenge is kept; pick a day (default: today's, still running). */
export function DailyPage() {
  const [params, setParams] = useSearchParams();
  const day = params.get("day") ?? undefined;
  const { data, error, isPending, dataUpdatedAt } = useDaily(day);
  const [board, setBoard] = useState<Board>("first");
  const left = useCountdown(data?.live ? data.ends_in : undefined, dataUpdatedAt);

  const days = data?.days ?? [];
  const index = data ? days.findIndex((d) => d.day === data.day) : -1;
  const go = (d: string | undefined) => {
    const next = new URLSearchParams(params);
    if (!d || d === data?.today) next.delete("day");
    else next.set("day", d);
    setParams(next, { replace: true });
  };

  if (error) return <ErrorState error={error} />;

  const s = data?.settings;
  return (
    <Stack gap={8}>
      <Stack direction="row" align="center" justify="between" gap={4} wrap>
        <Stack gap={1}>
          <Text variant="headline" as="h1">
            Daily race
          </Text>
          <Caption className="text-body">Everyone runs the same moon, seed, events and tool bans, solo. A new race starts every day at 00:00 UTC.</Caption>
        </Stack>
        <Stack direction="row" align="center" gap={2}>
          <Button variant="secondary" size="icon" aria-label="Previous day" disabled={index < 0 || index >= days.length - 1} onClick={() => go(days[index + 1]?.day)}>
            <ChevronLeft aria-hidden />
          </Button>
          <select aria-label="Race day" className={selectCls} value={data?.day ?? ""} onChange={(e) => go(e.target.value)} disabled={days.length === 0}>
            {days.map((d) => (
              <option key={d.day} value={d.day}>
                {d.day === data?.today ? `${d.day}  (today)` : d.day}  ·  {d.players} {d.players === 1 ? "player" : "players"}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="icon" aria-label="Next day" disabled={index <= 0} onClick={() => go(days[index - 1]?.day)}>
            <ChevronRight aria-hidden />
          </Button>
        </Stack>
      </Stack>

      {data && (
        <Stack direction="row" align="center" gap={2} wrap>
          {data.live ? (
            <Badge className="h-8 px-3 text-body" tone={data.locked ? "danger" : "accent"}>
              <CalendarClock aria-hidden className="size-4" />
              {data.locked ? "Opens at 00:01 UTC" : `Live  ·  ends in ${fmtCountdown(left)}`}
            </Badge>
          ) : (
            <Badge className="h-8 px-3 text-body">Final results</Badge>
          )}
        </Stack>
      )}

      {isPending || !s ? (
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard tone="highlight" label="Moon" value={s.moon} sub={`Seed ${s.seed}`} />
          <StatCard
            label="Events"
            value={s.events.length === 0 ? "None" : s.events.length}
            sub={s.events.length === 0 ? "Standard rules" : s.events.map(eventLabel).join(" · ")}
            className="md:col-span-2"
          />
          <StatCard label="Banned tools" value={s.banned.length} sub={s.banned.map(toolLabel).join(" · ")} />
        </div>
      )}

      <Section title="Leaderboard">
        <Stack direction="row" align="center" justify="between" gap={4} wrap>
          <SegmentedTabs
            label="Leaderboard"
            value={board}
            onChange={setBoard}
            options={[
              { value: "first", label: "First play" },
              { value: "best", label: "Best" },
            ]}
          />
          <Caption className="text-body">
            {board === "first" ? "Each player's first run of the day only." : "Each player's best run, any number of tries."}
          </Caption>
        </Stack>
        {isPending || !data ? (
          <Skeleton className="h-64 rounded-card" />
        ) : (
          <BoardTable rows={board === "first" ? data.first : data.best} live={data.live} />
        )}
      </Section>
    </Stack>
  );
}
