import { ExternalLink, Swords, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { Avatar } from "@/components/Avatar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/DataTable";
import { EventsCell } from "@/components/MatchRow";
import { MoonRadar } from "@/components/MoonRadar";
import { PlayerLink } from "@/components/PlayerLink";
import { RankBadge } from "@/components/RankBadge";
import { StatCard, StatCardSkeleton } from "@/components/StatCard";
import { EmptyState, ErrorState } from "@/components/StateBlock";
import { Caption, Headline, Text } from "@/components/typography/Text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Panel, Section } from "@/components/layout/Section";
import { Stack } from "@/components/layout/Stack";
import { usePlayer } from "@/hooks/queries";
import { achievements } from "@/lib/achievements";
import { ApiError, type PlayerResponse } from "@/lib/api";
import { eventKindLabel, fmtDate, fmtMoney, fmtPct, fmtSigned, fmtTr, kindLabel } from "@/lib/format";
import { playerStats, type Outcome, type PlayerStats } from "@/lib/stats";
import { cn } from "@/lib/utils";

export function PlayerPage() {
  const { steamId = "" } = useParams();
  const { data, error, isPending } = usePlayer(steamId);
  const stats = useMemo(() => (data ? playerStats(data.matches, steamId) : null), [data, steamId]);

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState icon={UserX} title="Player not found">
        Nobody with this Steam ID has played LCF yet.
      </EmptyState>
    );
  }
  if (error) return <ErrorState error={error} />;
  if (isPending || !data || !stats) return <PlayerSkeleton />;

  return (
    <Stack gap={12}>
      <PlayerHeader data={data} />
      <RatingCards data={data} stats={stats} />
      <MoonPanel stats={stats} />
      <BestRecords stats={stats} />
      <EventStats stats={stats} />
      <Achievements data={data} stats={stats} />
      <RecentMatches stats={stats} />
    </Stack>
  );
}

function PlayerHeader({ data }: { data: PlayerResponse }) {
  const p = data.profile;
  return (
    <div className="flex flex-wrap items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <Avatar src={data.avatar} name={p.name} size="xl" />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Headline className="truncate">{p.name}</Headline>
            <RankBadge rank={p.rank} />
            {!p.provisional && <Badge>{fmtTr(p.tr)} TR</Badge>}
          </div>
          <Caption className="text-body">Joined {fmtDate(data.joined)}</Caption>
          <a
            href={`https://steamcommunity.com/profiles/${p.steam_id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit cursor-pointer items-center gap-1 rounded-control text-caption text-muted transition-colors hover:text-fg"
          >
            Steam profile
            <ExternalLink aria-hidden className="size-3" />
          </a>
        </div>
      </div>
      {p.position != null && (
        <div className="flex flex-wrap gap-2">
          <Badge className="h-8 px-3 text-body">
            <span className="text-primary-300">#{p.position}</span> Ladder
          </Badge>
          <Badge className="h-8 px-3 text-body">
            <span className="text-primary-300">Top {Math.max(1, Math.ceil((p.position / Math.max(data.ranked_total, 1)) * 100))}%</span>
          </Badge>
        </div>
      )}
    </div>
  );
}

function RatingCards({ data, stats }: { data: PlayerResponse; stats: PlayerStats }) {
  const p = data.profile;
  const peak = Math.max(data.peak_tr ?? 0, p.provisional ? 0 : p.tr);
  return (
    <Section title="Rating">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <StatCard
          tone="highlight"
          big
          className="col-span-2"
          label="Current TR"
          value={p.provisional ? "?" : fmtTr(p.tr)}
          sub={p.provisional ? `Placement ${p.games}/10` : `Glicko ${fmtTr(p.glicko)} ±${fmtTr(p.rd)}`}
        />
        <StatCard label="Peak TR" value={peak > 0 ? fmtTr(peak) : "-"} sub={peak > 0 && !p.provisional ? `${fmtTr(Math.max(0, peak - p.tr))} below peak` : "No rated games"} />
        <StatCard label="Matches" value={stats.games} sub={`${stats.wins} wins`} />
        <StatCard label="Win rate" value={fmtPct(stats.wins, stats.games)} sub={`${stats.losses} losses`} />
        <StatCard label="Ladder rank" value={p.position != null ? `#${p.position}` : "-"} sub={p.position != null ? `of ${data.ranked_total} players` : "Not ranked yet"} />
      </div>
    </Section>
  );
}

function MoonPanel({ stats }: { stats: PlayerStats }) {
  return (
    <Section title="Moons" aside={`${stats.distinctMoons} played`}>
      {stats.moons.length === 0 ? (
        <EmptyState title="No moons played yet">Moon win rates appear after the first finished match.</EmptyState>
      ) : (
        <Panel className="grid items-center gap-6 p-6 md:grid-cols-[18rem_1fr]">
          <MoonRadar moons={stats.moons} />
          <Table className="min-w-0">
            <THead>
              <tr>
                <TH>Moon</TH>
                <TH align="right">Matches</TH>
                <TH align="right">Win rate</TH>
                <TH align="right">Best value</TH>
              </tr>
            </THead>
            <TBody>
              {stats.moons.map((m) => (
                <TR key={m.moon} inset>
                  <TD>{m.moon}</TD>
                  <TD align="right" className="text-muted tabular-nums">
                    {m.games}
                  </TD>
                  <TD align="right" className="text-primary-300 tabular-nums">
                    {fmtPct(m.wins, m.games)}
                  </TD>
                  <TD align="right" className="tabular-nums">
                    {fmtMoney(m.best)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Panel>
      )}
    </Section>
  );
}

function BestRecords({ stats }: { stats: PlayerStats }) {
  const b = stats.bestScore;
  const w = stats.biggestWin;
  return (
    <Section title="Best records">
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          label="Highest ship value"
          value={b ? fmtMoney(b.value) : "-"}
          sub={b ? `${b.pm.match.moon} · ${fmtDate(b.pm.match.created)}` : "No matches yet"}
          foot={b ? `vs ${b.pm.opp.name ?? "Unknown"}` : undefined}
        />
        <StatCard
          label="Biggest win margin"
          value={w ? `+${fmtMoney(w.value)}` : "-"}
          sub={w ? `${fmtMoney(w.pm.me.score)} to ${fmtMoney(w.pm.opp.score)} · ${w.pm.match.moon}` : "No wins on ship value yet"}
          foot={w ? fmtDate(w.pm.match.created) : undefined}
        />
        <StatCard
          label="Longest win streak"
          value={`${stats.longestStreak} ${stats.longestStreak === 1 ? "win" : "wins"}`}
          sub={stats.currentStreak > 0 ? `On a ${stats.currentStreak} win streak now` : "No active streak"}
          foot={`${stats.deathlessWins} deathless ${stats.deathlessWins === 1 ? "win" : "wins"}`}
        />
      </div>
    </Section>
  );
}

function EventStats({ stats }: { stats: PlayerStats }) {
  if (stats.events.length === 0) return null;
  return (
    <Section title="Events" aside="Win rate by event">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.events.map((e) => (
          <StatCard key={e.kind} label={eventKindLabel(e.kind)} value={fmtPct(e.wins, e.games)} accent sub={`${e.wins} of ${e.games} won`} />
        ))}
      </div>
    </Section>
  );
}

function Achievements({ data, stats }: { data: PlayerResponse; stats: PlayerStats }) {
  const list = useMemo(() => achievements(stats, data.profile, data.peak_tr), [stats, data]);
  const done = list.filter((a) => a.unlocked).length;
  return (
    <Section title="Achievements" aside={`${done} of ${list.length}`}>
      <Panel className="flex flex-col gap-6 p-5">
        <div
          role="progressbar"
          aria-label="Achievements unlocked"
          aria-valuemin={0}
          aria-valuemax={list.length}
          aria-valuenow={done}
          className="h-1 w-full overflow-hidden rounded-pill bg-surface-3"
        >
          <div className="h-full bg-primary-500 transition-[width] duration-500" style={{ width: `${(done / list.length) * 100}%` }} />
        </div>
        <ul className="grid grid-cols-3 gap-y-6 sm:grid-cols-5 lg:grid-cols-7">
          {list.map((a) => (
            <li key={a.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="flex w-full cursor-help flex-col items-center gap-2 rounded-control p-1" aria-label={`${a.name}: ${a.description}${a.unlocked ? " (unlocked)" : " (locked)"}`}>
                    <span className={cn("flex size-12 items-center justify-center rounded-pill [&_svg]:size-5", a.unlocked ? "bg-primary-600 text-white" : "bg-surface-3 text-muted")}>
                      <a.icon aria-hidden />
                    </span>
                    <Text variant="caption" tone={a.unlocked ? "default" : "muted"} className="text-center">
                      {a.name}
                    </Text>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{a.description}</TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      </Panel>
    </Section>
  );
}

const OUTCOME: Record<Outcome, { label: string; className: string }> = {
  win: { label: "Win", className: "text-primary-300" },
  loss: { label: "Loss", className: "text-danger" },
  draw: { label: "Draw", className: "text-muted" },
};

const PAGE = 10;

function RecentMatches({ stats }: { stats: PlayerStats }) {
  const [shown, setShown] = useState(PAGE);
  if (stats.history.length === 0) {
    return (
      <Section title="Recent matches">
        <EmptyState icon={Swords} title="No matches yet">
          Finished matches appear here.
        </EmptyState>
      </Section>
    );
  }
  const rows = stats.history.slice(0, shown);
  return (
    <Section title="Recent matches" aside={`${stats.history.length} total`}>
      <Table>
        <THead>
          <tr>
            <TH>Result</TH>
            <TH>Opponent</TH>
            <TH>Mode</TH>
            <TH>Moon</TH>
            <TH>Events</TH>
            <TH align="right">Ship value</TH>
            <TH align="right">TR</TH>
            <TH align="right">Date</TH>
          </tr>
        </THead>
        <TBody>
          {rows.map((pm) => (
            <TR key={pm.match.id} interactive>
              <TD className={cn("w-20 font-semibold", OUTCOME[pm.outcome].className)}>{OUTCOME[pm.outcome].label}</TD>
              <TD className="min-w-40">
                <PlayerLink player={pm.opp} />
              </TD>
              <TD className="text-muted">{kindLabel(pm.match.kind)}</TD>
              <TD>{pm.match.moon}</TD>
              <TD className="max-w-48 text-muted">
                <EventsCell match={pm.match} />
              </TD>
              <TD align="right" className="tabular-nums">
                {fmtMoney(pm.me.score)} <span className="text-muted">/ {fmtMoney(pm.opp.score)}</span>
              </TD>
              <TD align="right" className={cn("tabular-nums", pm.trDelta == null ? "text-muted" : pm.trDelta >= 0 ? "text-primary-300" : "text-danger")}>
                {pm.trDelta == null ? "-" : fmtSigned(pm.trDelta)}
              </TD>
              <TD align="right" className="text-muted tabular-nums">
                {fmtDate(pm.match.created)}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {shown < stats.history.length && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setShown((s) => s + PAGE)}>
            Show {Math.min(PAGE, stats.history.length - shown)} more
          </Button>
        </div>
      )}
    </Section>
  );
}

function PlayerSkeleton() {
  return (
    <Stack gap={12} aria-busy>
      <div className="flex items-center gap-4">
        <Skeleton className="size-18 rounded-card" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <StatCardSkeleton big className="col-span-2" />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <Skeleton className="h-80 rounded-card" />
      <div className="grid gap-3 md:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    </Stack>
  );
}
