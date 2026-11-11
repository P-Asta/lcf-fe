import { CalendarClock, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Table, TBody, TD, TH, THead, TR, RankCell } from "@/components/DataTable";
import { PlayerLink } from "@/components/PlayerLink";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { EmptyState, ErrorState } from "@/components/StateBlock";
import { StatCard, StatCardSkeleton } from "@/components/StatCard";
import { Stack } from "@/components/layout/Stack";
import { Section } from "@/components/layout/Section";
import { Caption, Text } from "@/components/typography/Text";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDaily } from "@/hooks/queries";
import type { DailyRow } from "@/lib/api";
import { eventLabel, fmtCountdown, fmtMoney, toolLabel } from "@/lib/format";

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

function BoardTable({ rows }: { rows: DailyRow[] }) {
  if (rows.length === 0) return <EmptyState icon={Trophy} title="No runs yet today" />;
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

export function DailyPage() {
  const { data, error, isPending, dataUpdatedAt } = useDaily();
  const [board, setBoard] = useState<Board>("first");
  const left = useCountdown(data?.ends_in, dataUpdatedAt);

  if (error) return <ErrorState error={error} />;

  const s = data?.settings;
  return (
    <Stack gap={8}>
      <Stack direction="row" align="center" justify="between" gap={4} wrap>
        <Stack gap={1}>
          <Text variant="headline" as="h1">
            Daily challenge
          </Text>
          <Caption className="text-body">Everyone plays the same moon, seed, events and tool bans, solo. A new one starts at 00:00 UTC.</Caption>
        </Stack>
        {data && (
          <Badge className="h-9 px-4 text-body" tone={data.locked ? "danger" : "accent"}>
            <CalendarClock aria-hidden className="size-4" />
            {data.locked ? "Opens at 00:01 UTC" : `${data.day}  ·  ends in ${fmtCountdown(left)}`}
          </Badge>
        )}
      </Stack>

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
        {isPending ? <Skeleton className="h-64 rounded-card" /> : <BoardTable rows={(board === "first" ? data?.first : data?.best) ?? []} />}
      </Section>

      {data && data.first.length > 0 && (
        <Stack direction="row" align="center" gap={3}>
          <Avatar src={data.first[0].avatar} name={data.first[0].name} size="md" />
          <Caption className="text-body">
            Leading the first-play board: <span className="text-fg">{data.first[0].name}</span> with {fmtMoney(data.first[0].score)}
          </Caption>
        </Stack>
      )}
    </Stack>
  );
}
