import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlayerLink } from "@/components/PlayerLink";
import { TD, TR } from "@/components/DataTable";
import type { Match, MatchSide } from "@/lib/api";
import { eventLabel, fmtMoney, fmtTime, kindLabel, reasonLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function EventsCell({ match }: { match: Match }) {
  if (match.events.length === 0) return <span className="text-muted">-</span>;
  const [first, ...rest] = match.events;
  return (
    <span className="flex items-center gap-1">
      <span className="truncate">{eventLabel(first)}</span>
      {rest.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="cursor-help rounded-control" aria-label={`${rest.length} more events`}>
              <Badge tone="accent">+{rest.length}</Badge>
            </button>
          </TooltipTrigger>
          <TooltipContent>{match.events.map(eventLabel).join(" · ")}</TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

function Side({ side, won }: { side: MatchSide; won: boolean }) {
  return (
    <span className="flex min-w-0 items-center justify-between gap-3">
      <PlayerLink player={side} strong={won} />
      <span className={cn("shrink-0 tabular-nums", won ? "font-semibold text-primary-300" : "text-muted")}>{fmtMoney(side.score)}</span>
    </span>
  );
}

export function MatchRow({ match, inset }: { match: Match; inset?: boolean }) {
  return (
    <TR interactive inset={inset}>
      <TD className="w-20 text-muted tabular-nums">{fmtTime(match.created)}</TD>
      <TD className="w-24">
        <Badge tone={match.kind === "ranked" ? "accent" : "neutral"}>{kindLabel(match.kind)}</Badge>
      </TD>
      <TD className="w-32">{match.moon}</TD>
      <TD className="min-w-56">
        <Side side={match.p1} won={match.winner === 1} />
      </TD>
      <TD className="min-w-56">
        <Side side={match.p2} won={match.winner === 2} />
      </TD>
      <TD className="max-w-48 text-muted">
        <EventsCell match={match} />
      </TD>
      <TD align="right" className="text-muted">
        {match.winner === 0 ? "Draw" : reasonLabel(match.reason)}
      </TD>
    </TR>
  );
}
