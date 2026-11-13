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
import { OptionSelect } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDaily } from "@/hooks/queries";
import type { DailyRow } from "@/lib/api";
import { eventLabel, fmtCountdown, fmtMoney } from "@/lib/format";
import { BannedTools } from "@/components/ToolIcon";
import { SpotlightPanel } from "@/components/motion/SpotlightPanel";
import { PageTitle } from "@/components/motion/PageTitle";
import SplitFlapText from "@/components/reactbits/SplitFlapText";

type Board = "first" | "best";

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
    <Table className="min-w-0">
      <THead>
        <tr>
          <TH className="w-12 sm:w-16">#</TH>
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
          <PageTitle text="Daily race" />
          <Caption className="text-body">Everyone runs the same moon, seed, events and tool bans, solo. A new race starts every day at 00:00 UTC.</Caption>
        </Stack>
        <Stack direction="row" align="center" gap={2} className="w-full sm:w-auto">
          <Button variant="secondary" size="icon" aria-label="Previous day" disabled={index < 0 || index >= days.length - 1} onClick={() => go(days[index + 1]?.day)}>
            <ChevronLeft aria-hidden />
          </Button>
          <OptionSelect
            label="Race day"
            className="min-w-0 flex-1 tabular-nums sm:w-64 sm:flex-none"
            value={data?.day ?? ""}
            onChange={go}
            disabled={days.length === 0}
            options={days.map((d) => ({
              value: d.day,
              label: `${d.day === data?.today ? `${d.day} (today)` : d.day} · ${d.players} ${d.players === 1 ? "player" : "players"}`,
            }))}
          />
          <Button variant="secondary" size="icon" aria-label="Next day" disabled={index <= 0} onClick={() => go(days[index - 1]?.day)}>
            <ChevronRight aria-hidden />
          </Button>
        </Stack>
      </Stack>

      {data && (
        <Stack direction="row" align="center" gap={2} wrap>
          {data.live && !data.locked ? (
            <>
              <Badge className="h-8 px-3 text-body" tone="accent">
                <CalendarClock aria-hidden className="size-4" />
                Live · ends in
              </Badge>
              <span className="sr-only">{fmtCountdown(left)}</span>
              <SplitFlapText
                aria-hidden
                text={fmtCountdown(left)}
                charset="0123456789:"
                loop={false}
                padTo={8}
                flipsPerChar={3}
                flipDuration={0.08}
                stagger={0.02}
                fontSize={18}
                gap={3}
                tileRadius={4}
                tileColor="#1f0f10"
                textColor="#f2e8e8"
                className="tabular-nums"
              />
            </>
          ) : data.live ? (
            <Badge className="h-8 px-3 text-body" tone="danger">
              <CalendarClock aria-hidden className="size-4" />
              Opens at 00:01 UTC
            </Badge>
          ) : (
            <Badge className="h-8 px-3 text-body">Final results</Badge>
          )}
        </Stack>
      )}

      {isPending || !s ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton className="sm:col-span-2" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard tone="highlight" label="Moon" value={s.moon} sub={`Seed ${s.seed}`} />
          <StatCard
            label="Events"
            value={s.events.length === 0 ? "None" : s.events.length}
            sub={s.events.length === 0 ? "Standard rules" : s.events.map(eventLabel).join(" · ")}
          />
          <SpotlightPanel className="flex min-h-28 flex-col gap-3 p-4 sm:col-span-2 sm:p-5">
            <Stack direction="row" align="baseline" justify="between" gap={2}>
              <Text variant="label" tone="muted">
                Banned tools
              </Text>
              <Text variant="caption" tone="muted" className="tabular-nums">
                {s.banned.length === 0 ? "None" : `${s.banned.length} banned`}
              </Text>
            </Stack>
            <BannedTools tools={s.banned} />
          </SpotlightPanel>
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
