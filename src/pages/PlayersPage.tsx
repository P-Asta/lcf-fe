import { Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Avatar } from "@/components/Avatar";
import { Pagination } from "@/components/Pagination";
import { RankBadge } from "@/components/RankBadge";
import { SearchField } from "@/components/SearchField";
import { EmptyState, ErrorState } from "@/components/StateBlock";
import { Caption, Text } from "@/components/typography/Text";
import { Skeleton } from "@/components/ui/skeleton";
import { Stack } from "@/components/layout/Stack";
import { useLeaderboard } from "@/hooks/queries";
import { fmtPct, fmtTr } from "@/lib/format";

const PAGE = 18;

export function PlayersPage() {
  const { data, error, isPending } = useLeaderboard();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(data?.entries ?? [])].filter((e) => !q || e.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
  }, [data, query]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const current = Math.min(page, pages);
  const slice = list.slice((current - 1) * PAGE, current * PAGE);

  return (
    <Stack gap={8}>
      <Stack direction="row" align="center" justify="between" gap={4} wrap>
        <Stack gap={1}>
          <Text variant="headline" as="h1">
            Players
          </Text>
          <Caption className="text-body">Ranked players. Others show up after their placement games.</Caption>
        </Stack>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-card" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={Users} title={query ? "No player matches that name" : "No ranked players yet"} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slice.map((e) => (
            <li key={e.steam_id}>
              <Link to={`/players/${e.steam_id}`} className="flex h-20 cursor-pointer items-center gap-4 rounded-card bg-surface px-4 transition-colors hover:bg-surface-2">
                <Avatar src={e.avatar} name={e.name} size="lg" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2">
                    <Text variant="title" className="truncate">
                      {e.name}
                    </Text>
                    <RankBadge rank={e.rank} />
                  </span>
                  <Caption>
                    #{e.position} · {fmtTr(e.tr)} TR · {fmtPct(e.wins, e.games)} win rate
                  </Caption>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={current} pages={pages} onChange={setPage} />
    </Stack>
  );
}
