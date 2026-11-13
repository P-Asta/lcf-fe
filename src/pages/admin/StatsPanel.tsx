import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StatCard, StatCardSkeleton } from "@/components/StatCard";
import { Table, TBody, TD, TH, THead, TR } from "@/components/DataTable";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { ErrorState } from "@/components/StateBlock";
import { Stack } from "@/components/layout/Stack";
import { Panel, Section } from "@/components/layout/Section";
import { Caption, Text } from "@/components/typography/Text";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi, type UsageDay, type UsageWindow } from "@/lib/api";
import { fmtDate, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";

type Range = "7" | "30" | "90";
type HourMetric = "players" | "connections" | "games";

type Series = { key: string; label: string; color: string };

/** Game modes, in stacking order (bottom first). */
const MODES: (Series & { pick: (d: UsageDay) => number })[] = [
  { key: "ranked", label: "Ranked", color: "#ff4d3d", pick: (d) => d.ranked },
  { key: "quick", label: "Quick play", color: "#e3b341", pick: (d) => d.quick },
  { key: "custom_public", label: "Public room", color: "#4f9ee8", pick: (d) => d.custom_public },
  { key: "custom_private", label: "Private room", color: "#9b7cf0", pick: (d) => d.custom_private },
  { key: "duel_rooms", label: "1v1 room", color: "#3fbf8a", pick: (d) => d.duel_rooms },
  { key: "daily", label: "Daily runs", color: "#b39a9a", pick: (d) => d.daily_runs },
];

const PLAYERS: Series[] = [{ key: "players", label: "Unique players", color: "#ff8b80" }];

const games = (w: UsageWindow) => w.ranked + w.quick + w.custom + w.duel_rooms;

const dayLabel = (day: string, long = false) =>
  new Date(`${day}T00:00:00`).toLocaleDateString(undefined, long ? { weekday: "short", month: "short", day: "numeric" } : { month: "numeric", day: "numeric" });

const fmtDuration = (secs: number | null) => {
  if (secs == null) return "-";
  const m = Math.round(secs / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

/** Stacked bar chart drawn with plain divs (scales to any width without distorting text). */
function BarChart({
  labels,
  hoverLabels,
  series,
  values,
  height = "h-48",
}: {
  labels: string[];
  hoverLabels?: string[];
  series: Series[];
  /** values[column][series] */
  values: number[][];
  height?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = values.map((v) => v.reduce((a, b) => a + b, 0));
  const max = Math.max(1, ...totals);
  const n = labels.length;
  const every = Math.max(1, Math.ceil(n / 10));
  const shown = hover ?? n - 1;

  return (
    <Stack gap={2}>
      <div className="flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-caption">
        <span className="font-medium text-fg">{(hoverLabels ?? labels)[shown]}</span>
        {series.map((s, i) => (
          <span key={s.key} className="flex items-center gap-1.5 text-muted">
            <span className="inline-block size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
            {s.label}
            <span className="font-semibold text-fg tabular-nums">{fmtInt(values[shown]?.[i] ?? 0)}</span>
          </span>
        ))}
        {series.length > 1 && (
          <span className="text-muted">
            Total <span className="font-semibold text-fg tabular-nums">{fmtInt(totals[shown] ?? 0)}</span>
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <div className={cn("flex w-8 shrink-0 flex-col justify-between text-right text-caption text-muted tabular-nums", height)}>
          <span>{fmtInt(max)}</span>
          <span>{fmtInt(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={cn("relative flex items-end border-b border-line", n > 40 ? "gap-px" : "gap-0.5 sm:gap-1", height)}
            onPointerLeave={() => setHover(null)}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-line" aria-hidden />
            {values.map((col, i) => (
              <div
                key={i}
                className={cn("relative flex h-full min-w-0 flex-1 flex-col-reverse rounded-t-sm", hover === i && "bg-surface-3")}
                onPointerEnter={() => setHover(i)}
                title={`${(hoverLabels ?? labels)[i]}: ${fmtInt(totals[i])}`}
              >
                {col.map((v, j) =>
                  v > 0 ? (
                    <div
                      key={j}
                      className="w-full first:rounded-b-none last:rounded-t-sm"
                      style={{ height: `${(v / max) * 100}%`, background: series[j].color, opacity: hover == null || hover === i ? 1 : 0.6 }}
                    />
                  ) : null,
                )}
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-0.5 text-caption text-muted sm:gap-1">
            {labels.map((l, i) => (
              <span key={i} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
                {i % every === 0 ? l : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Stack>
  );
}

function Cards({ s }: { s: { today: UsageWindow; week: UsageWindow; month: UsageWindow } }) {
  const card = (label: string, pick: (w: UsageWindow) => number, highlight = false) => (
    <StatCard
      label={`${label} today`}
      tone={highlight ? "highlight" : "default"}
      value={fmtInt(pick(s.today))}
      sub={`7 days ${fmtInt(pick(s.week))} · 30 days ${fmtInt(pick(s.month))}`}
    />
  );
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {card("Players", (w) => w.players, true)}
      {card("Peak online", (w) => w.peak_online)}
      {card("New players", (w) => w.new_players)}
      {card("Games", games)}
      {card("Ranked", (w) => w.ranked)}
      {card("Quick play", (w) => w.quick)}
      {card("Custom room games", (w) => w.custom)}
      {card("Daily runs", (w) => w.daily_runs)}
    </div>
  );
}

export function StatsPanel({ pw }: { pw: string }) {
  const [range, setRange] = useState<Range>("30");
  const [metric, setMetric] = useState<HourMetric>("players");
  const q = useQuery({
    queryKey: ["admin", "stats", pw, range],
    queryFn: () => adminApi.stats(pw, Number(range)),
    refetchInterval: 60_000,
    retry: false,
    placeholderData: (prev) => prev,
  });

  const aside = q.data?.tracking_since ? `Connections logged since ${fmtDate(q.data.tracking_since)}` : undefined;
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Section title="Usage statistics" aside={aside}>
      <Stack direction="row" align="center" justify="between" gap={3} wrap>
        <SegmentedTabs
          label="Range"
          value={range}
          onChange={setRange}
          options={[
            { value: "7", label: "7 days" },
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
          ]}
        />
        <Caption>Days and hours in your timezone ({tzName})</Caption>
      </Stack>

      {q.error ? (
        <ErrorState error={q.error} />
      ) : !q.data ? (
        <Stack gap={3}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </Stack>
      ) : (
        <Body data={q.data} metric={metric} setMetric={setMetric} />
      )}
    </Section>
  );
}

function Body({
  data,
  metric,
  setMetric,
}: {
  data: NonNullable<Awaited<ReturnType<typeof adminApi.stats>>>;
  metric: HourMetric;
  setMetric: (m: HourMetric) => void;
}) {
  const days = data.days;
  const labels = days.map((d) => dayLabel(d.day));
  const longLabels = days.map((d) => dayLabel(d.day, true));
  const r = data.summary.range;
  const busiest = data.hours.reduce((a, b) => (b[metric] > a[metric] ? b : a), data.hours[0]);
  const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

  return (
    <Stack gap={6}>
      <Cards s={data.summary} />

      <Panel className="flex flex-col gap-3 p-4">
        <Stack gap={1}>
          <Text variant="title">Players per day</Text>
          <Caption>
            {fmtInt(r.players)} unique players in {days.length} days · peak {fmtInt(r.peak_online)} online at once · {fmtInt(r.new_players)} new
          </Caption>
        </Stack>
        <BarChart labels={labels} hoverLabels={longLabels} series={PLAYERS} values={days.map((d) => [d.players])} />
      </Panel>

      <Panel className="flex flex-col gap-3 p-4">
        <Stack gap={1}>
          <Text variant="title">Games per day</Text>
          <Caption>
            {fmtInt(games(r))} games · {fmtInt(r.ranked)} ranked · {fmtInt(r.quick)} quick play · {fmtInt(r.custom)} custom room ·{" "}
            {fmtInt(r.daily_runs)} daily runs by {fmtInt(r.daily_players)} players
          </Caption>
        </Stack>
        <BarChart labels={labels} hoverLabels={longLabels} series={MODES} values={days.map((d) => MODES.map((m) => m.pick(d)))} />
      </Panel>

      <Panel className="flex flex-col gap-3 p-4">
        <Stack direction="row" align="center" justify="between" gap={3} wrap>
          <Stack gap={1}>
            <Text variant="title">By hour of day</Text>
            <Caption>
              Busiest hour: {hourLabel(busiest.hour)} ({fmtInt(busiest[metric])}) · summed over {days.length} days
            </Caption>
          </Stack>
          <SegmentedTabs
            label="Hour metric"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "players", label: "Players" },
              { value: "connections", label: "Connections" },
              { value: "games", label: "Games" },
            ]}
          />
        </Stack>
        <BarChart
          labels={data.hours.map((h) => String(h.hour))}
          hoverLabels={data.hours.map((h) => `${hourLabel(h.hour)}–${hourLabel((h.hour + 1) % 24)}`)}
          series={[
            {
              key: metric,
              label: metric === "players" ? "Unique players" : metric === "connections" ? "Connections" : "Games ended",
              color: metric === "games" ? "#e3b341" : "#ff8b80",
            },
          ]}
          values={data.hours.map((h) => [h[metric]])}
        />
        {metric === "players" && <Caption>A player counts once per hour bucket over the whole range (distinct players).</Caption>}
      </Panel>

      <Stack gap={2}>
        <Text variant="title">Per day</Text>
        <Table className="min-w-4xl">
          <THead>
            <tr>
              <TH>Day</TH>
              <TH align="right">Players</TH>
              <TH align="right">New</TH>
              <TH align="right">Peak</TH>
              <TH align="right">Conn.</TH>
              <TH align="right">Avg session</TH>
              <TH align="right">Ranked</TH>
              <TH align="right">Quick</TH>
              <TH align="right">Public room</TH>
              <TH align="right">Private room</TH>
              <TH align="right">1v1 room</TH>
              <TH align="right">Daily</TH>
            </tr>
          </THead>
          <TBody>
            {[...days].reverse().map((d) => (
              <TR key={d.day} className="tabular-nums">
                <TD className="whitespace-nowrap">{dayLabel(d.day, true)}</TD>
                <TD align="right" className="font-semibold">
                  {fmtInt(d.players)}
                </TD>
                <TD align="right">{fmtInt(d.new_players)}</TD>
                <TD align="right">{fmtInt(d.peak_online)}</TD>
                <TD align="right">{fmtInt(d.connections)}</TD>
                <TD align="right">{fmtDuration(d.avg_session_secs)}</TD>
                <TD align="right">{fmtInt(d.ranked)}</TD>
                <TD align="right">{fmtInt(d.quick)}</TD>
                <TD align="right">{fmtInt(d.custom_public)}</TD>
                <TD align="right">{fmtInt(d.custom_private)}</TD>
                <TD align="right">{fmtInt(d.duel_rooms)}</TD>
                <TD align="right">
                  {fmtInt(d.daily_runs)}
                  {d.daily_players > 0 && <span className="text-muted"> ({fmtInt(d.daily_players)})</span>}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <Caption>Daily: runs (players). Runs that scored nothing are not stored. Custom room games are counted from when this panel was added.</Caption>
      </Stack>
    </Stack>
  );
}
