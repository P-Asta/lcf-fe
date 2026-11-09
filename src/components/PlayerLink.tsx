import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { Avatar } from "@/components/Avatar";
import { RankBadge } from "@/components/RankBadge";
import { Caption, Label, Text } from "@/components/typography/Text";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { fmtPct, fmtTr } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PlayerSummary = {
  steam_id: string;
  name: string | null;
  avatar: string | null;
  tr?: number;
  rank?: string;
  games?: number;
  wins?: number;
  position?: number;
};

type PlayerLinkProps = { player: PlayerSummary; className?: string; avatar?: boolean; strong?: boolean };

export function PlayerLink({ player, className, avatar = true, strong }: PlayerLinkProps) {
  const name = player.name ?? "Unknown";
  const link = (
    <Link
      to={`/players/${player.steam_id}`}
      className={cn(
        "inline-flex min-w-0 cursor-pointer items-center gap-2 rounded-control transition-colors hover:text-primary-200",
        strong ? "text-fg" : "text-primary-300",
        className,
      )}
    >
      {avatar && <Avatar src={player.avatar} name={name} size="sm" />}
      <span className="truncate">{name}</span>
    </Link>
  );
  if (player.tr == null) return link;
  return (
    <HoverCard>
      <HoverCardTrigger asChild>{link}</HoverCardTrigger>
      <HoverCardContent>
        <div className="flex items-center gap-3">
          <Avatar src={player.avatar} name={name} size="lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <Text variant="title" className="truncate">
                {name}
              </Text>
              <RankBadge rank={player.rank} />
            </div>
            <Caption>{player.position ? `#${player.position} on the ladder` : "Unranked"}</Caption>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-control bg-surface p-3 text-center">
          <div className="flex flex-col">
            <Text variant="title" tone="accent" className="tabular-nums">
              {fmtTr(player.tr)}
            </Text>
            <Label>TR</Label>
          </div>
          <div className="flex flex-col">
            <Text variant="title" tone="accent" className="tabular-nums">
              {player.wins ?? 0}
            </Text>
            <Label>Wins</Label>
          </div>
          <div className="flex flex-col">
            <Text variant="title" tone="accent" className="tabular-nums">
              {fmtPct(player.wins ?? 0, player.games ?? 0)}
            </Text>
            <Label>Win rate</Label>
          </div>
        </div>
        <Link
          to={`/players/${player.steam_id}`}
          className="mt-3 flex cursor-pointer items-center justify-center gap-1 rounded-control py-1 text-caption text-muted transition-colors hover:text-fg"
        >
          <ArrowUpRight aria-hidden className="size-4" />
          View profile
        </Link>
      </HoverCardContent>
    </HoverCard>
  );
}
