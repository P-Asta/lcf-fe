import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, LockKeyhole, LogOut, ShieldAlert, Users } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Avatar } from "@/components/Avatar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { RankBadge } from "@/components/RankBadge";
import { SearchField } from "@/components/SearchField";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { EmptyState, ErrorState } from "@/components/StateBlock";
import { Stack } from "@/components/layout/Stack";
import { Panel, Section } from "@/components/layout/Section";
import { Caption, Text } from "@/components/typography/Text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi, ApiError, type AdminPlayer, type AuditEntry } from "@/lib/api";
import { fmtDate, fmtTime, fmtTr } from "@/lib/format";
import { BadgeManager, PlayerBadgeEditor } from "@/pages/admin/BadgeManager";
import { FamilyShare } from "@/pages/admin/FamilyShare";

const KEY = "lcf-admin-pw";
const PAGE = 50;

const readPw = () => {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};
const writePw = (pw: string) => {
  try {
    if (pw) sessionStorage.setItem(KEY, pw);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked: stay logged in for this page only */
  }
};

const isAuthError = (e: unknown) => e instanceof ApiError && (e.status === 401 || e.status === 404);
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const fmtWhen = (unix: number) => (unix > 0 ? `${fmtDate(unix)} ${fmtTime(unix)}` : "-");
const banText = (p: AdminPlayer) => (p.banned_until === -1 ? "Permanent" : `Until ${fmtWhen(p.banned_until)}`);

export function AdminPage() {
  const [pw, setPw] = useState(readPw);
  const logout = useCallback(() => {
    writePw("");
    setPw("");
  }, []);
  if (!pw) {
    return (
      <Login
        onLogin={(p) => {
          writePw(p);
          setPw(p);
        }}
      />
    );
  }
  return <Dashboard pw={pw} onLogout={logout} />;
}

function Login({ onLogin }: { onLogin: (pw: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.players(value);
      onLogin(value);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "The admin API is turned off on the server (ADMIN_PASSWD is not set)." : errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="mx-auto mt-12 flex w-full max-w-sm flex-col gap-4 p-6">
      <Stack direction="row" align="center" gap={2}>
        <LockKeyhole aria-hidden className="size-5 text-primary-300" />
        <Text variant="title" as="h1">
          Admin
        </Text>
      </Stack>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <Caption>Password</Caption>
          <Input type="password" autoComplete="current-password" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        {error && (
          <Text variant="caption" tone="danger" role="alert">
            {error}
          </Text>
        )}
        <Button type="submit" variant="primary" disabled={busy || !value}>
          {busy ? "Checking…" : "Log in"}
        </Button>
      </form>
    </Panel>
  );
}

type Filter = "all" | "online" | "banned" | "ranked";

function Dashboard({ pw, onLogout }: { pw: string; onLogout: () => void }) {
  const [tab, setTab] = useState<"players" | "badges" | "family" | "audit">("players");
  const players = useQuery({ queryKey: ["admin", "players", pw], queryFn: () => adminApi.players(pw), refetchInterval: 30_000, retry: false });

  const authFailed = isAuthError(players.error);
  useEffect(() => {
    if (authFailed) onLogout();
  }, [authFailed, onLogout]);
  if (authFailed) return null;

  const list = players.data?.entries ?? [];
  const online = list.filter((p) => p.online).length;
  const banned = list.filter((p) => p.banned).length;

  return (
    <Stack gap={8}>
      <Stack direction="row" align="center" justify="between" gap={4} wrap>
        <Stack gap={1}>
          <Text variant="headline" as="h1">
            Admin
          </Text>
          <Caption className="text-body">
            {players.data ? `${list.length} players · ${players.data.ranked_total} on the ladder · ${online} online · ${banned} banned` : "Loading players…"}
          </Caption>
        </Stack>
        <Button variant="ghost" onClick={onLogout}>
          <LogOut aria-hidden />
          Log out
        </Button>
      </Stack>

      <SegmentedTabs
        label="Admin sections"
        value={tab}
        onChange={setTab}
        options={[
          { value: "players", label: "Players" },
          { value: "badges", label: "Badges" },
          { value: "family", label: "Family share" },
          { value: "audit", label: "Audit log" },
        ]}
      />

      {tab === "players" ? (
        players.error ? (
          <ErrorState error={players.error} />
        ) : players.isPending ? (
          <Skeleton className="h-96 rounded-card" />
        ) : (
          <PlayerTable pw={pw} players={list} />
        )
      ) : tab === "badges" ? (
        <BadgeManager pw={pw} players={list} />
      ) : tab === "family" ? (
        <FamilyShare pw={pw} />
      ) : (
        <AuditTable pw={pw} />
      )}
    </Stack>
  );
}

function PlayerTable({ pw, players }: { pw: string; players: AdminPlayer[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => filter === "all" || (filter === "online" ? p.online : filter === "banned" ? p.banned : p.position != null))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.steam_id.includes(q) || p.last_ip.includes(q))
      .sort((a, b) => Number(b.online) - Number(a.online) || b.last_login - a.last_login);
  }, [players, query, filter]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const current = Math.min(page, pages);
  const slice = list.slice((current - 1) * PAGE, current * PAGE);

  return (
    <Stack gap={4}>
      <Stack direction="row" align="center" justify="between" gap={4} wrap>
        <SegmentedTabs
          label="Filter players"
          value={filter}
          onChange={(f) => {
            setFilter(f);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All" },
            { value: "online", label: "Online" },
            { value: "ranked", label: "Ranked" },
            { value: "banned", label: "Banned" },
          ]}
        />
        <SearchField
          value={query}
          onChange={(q) => {
            setQuery(q);
            setPage(1);
          }}
          placeholder="Name, Steam ID or IP"
        />
      </Stack>

      {list.length === 0 ? (
        <EmptyState icon={Users} title="No players match" />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH className="w-8" />
              <TH>Player</TH>
              <TH>Rank</TH>
              <TH align="right">TR</TH>
              <TH align="right">W / G</TH>
              <TH>Last login</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <TBody>
            {slice.map((p) => {
              const expanded = open === p.steam_id;
              return (
                <Fragment key={p.steam_id}>
                  <TR interactive className="cursor-pointer" onClick={() => setOpen(expanded ? null : p.steam_id)}>
                    <TD className="w-8 pr-0 text-muted">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Hide" : "Show"} details for ${p.name}`}
                        className="flex cursor-pointer items-center"
                      >
                        {expanded ? <ChevronDown aria-hidden className="size-4" /> : <ChevronRight aria-hidden className="size-4" />}
                      </button>
                    </TD>
                    <TD>
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar src={p.avatar} name={p.name} size="sm" />
                        <span className="truncate">{p.name}</span>
                      </span>
                    </TD>
                    <TD>
                      <RankBadge rank={p.rank} />
                    </TD>
                    <TD align="right" className="tabular-nums">
                      {fmtTr(p.tr)}
                    </TD>
                    <TD align="right" className="tabular-nums">
                      {p.wins} / {p.games}
                    </TD>
                    <TD className="text-muted">{fmtWhen(p.last_login)}</TD>
                    <TD>
                      {p.banned ? <Badge tone="danger">Banned</Badge> : p.online ? <Badge tone="accent">Online</Badge> : <Badge>Offline</Badge>}
                    </TD>
                  </TR>
                  {expanded && (
                    <tr>
                      <td colSpan={7} className="px-2 pb-3">
                        <PlayerDetail pw={pw} p={p} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </TBody>
        </Table>
      )}
      <Pagination page={current} pages={pages} onChange={setPage} />
    </Stack>
  );
}

function PlayerDetail({ pw, p }: { pw: string; p: AdminPlayer }) {
  const qc = useQueryClient();
  const [days, setDays] = useState("0");
  const [reason, setReason] = useState("");
  const audit = useQuery({ queryKey: ["admin", "audit", pw, p.steam_id], queryFn: () => adminApi.audit(pw, p.steam_id), retry: false });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["players"] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
  };
  const ban = useMutation({ mutationFn: () => adminApi.ban(pw, p.steam_id, Number(days) || 0, reason.trim()), onSuccess: refresh });
  const unban = useMutation({ mutationFn: () => adminApi.unban(pw, p.steam_id), onSuccess: refresh });
  const err = ban.error ?? unban.error;

  return (
    <div className="grid gap-4 rounded-card bg-surface-2 p-4 lg:grid-cols-2">
      <Stack gap={3}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body">
          <dt className="text-muted">Steam ID</dt>
          <dd className="flex flex-wrap gap-x-3 tabular-nums">
            {p.steam_id}
            <Link to={`/players/${p.steam_id}`} className="text-primary-300 hover:text-primary-200">
              Profile
            </Link>
            <a href={`https://steamcommunity.com/profiles/${p.steam_id}`} target="_blank" rel="noreferrer" className="text-primary-300 hover:text-primary-200">
              Steam
            </a>
          </dd>
          <dt className="text-muted">Ladder</dt>
          <dd>{p.position != null ? `#${p.position}` : "Not on the ladder"}</dd>
          <dt className="text-muted">Glicko</dt>
          <dd className="tabular-nums">
            {fmtTr(p.glicko)} ±{fmtTr(p.rd)}
          </dd>
          <dt className="text-muted">Last IP</dt>
          <dd className="tabular-nums">{p.last_ip || "-"}</dd>
          <dt className="text-muted">Joined</dt>
          <dd>{fmtWhen(p.created)}</dd>
          <dt className="text-muted">Last ranked game</dt>
          <dd>{fmtWhen(p.last_played)}</dd>
          {p.banned && (
            <>
              <dt className="text-danger">Ban</dt>
              <dd>
                {banText(p)}
                {p.ban_reason ? ` · ${p.ban_reason}` : ""}
              </dd>
            </>
          )}
        </dl>

        {p.banned ? (
          <Button variant="secondary" className="w-fit" disabled={unban.isPending} onClick={() => unban.mutate()}>
            {unban.isPending ? "Unbanning…" : "Unban"}
          </Button>
        ) : (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (window.confirm(`Ban ${p.name}${Number(days) ? ` for ${days} day(s)` : " permanently"}? They are kicked right away.`)) ban.mutate();
            }}
          >
            <label className="flex flex-col gap-1">
              <Caption>Length</Caption>
              <select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="h-9 cursor-pointer rounded-pill bg-surface px-4 text-body text-fg outline-none focus-visible:outline-2 focus-visible:outline-primary-400"
              >
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="0">Permanent</option>
              </select>
            </label>
            <label className="flex min-w-48 flex-1 flex-col gap-1">
              <Caption>Reason</Caption>
              <Input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="Shown to the player" />
            </label>
            <Button type="submit" variant="primary" className="bg-danger hover:bg-danger/80" disabled={ban.isPending}>
              <ShieldAlert aria-hidden />
              {ban.isPending ? "Banning…" : "Ban"}
            </Button>
          </form>
        )}
        {err && (
          <Text variant="caption" tone="danger" role="alert">
            {errText(err)}
          </Text>
        )}
        <PlayerBadgeEditor pw={pw} player={p} />
      </Stack>

      <Section title="Audit log" aside={audit.data ? `${audit.data.entries.length} entries` : undefined}>
        {audit.error ? (
          <Text variant="caption" tone="danger">
            {errText(audit.error)}
          </Text>
        ) : audit.isPending ? (
          <Skeleton className="h-24 rounded-card" />
        ) : audit.data.entries.length === 0 ? (
          <Caption>Nothing logged for this player.</Caption>
        ) : (
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {audit.data.entries.map((a) => (
              <AuditLine key={a.id} a={a} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function AuditLine({ a, withName }: { a: AuditEntry; withName?: boolean }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 rounded-control bg-surface px-3 py-2 text-caption">
      <span className="text-muted tabular-nums">{fmtWhen(a.created)}</span>
      <Badge tone={a.kind === "ban" ? "danger" : "neutral"}>{a.kind}</Badge>
      {withName && (
        <Link to={`/players/${a.steam_id}`} className="text-primary-300 hover:text-primary-200">
          {a.name ?? a.steam_id}
        </Link>
      )}
      <span className="min-w-0 break-words text-fg">{a.detail}</span>
      {a.match_id && <span className="text-muted">match {a.match_id.slice(0, 8)}</span>}
    </li>
  );
}

function AuditTable({ pw }: { pw: string }) {
  const audit = useQuery({ queryKey: ["admin", "audit", pw, "all"], queryFn: () => adminApi.audit(pw), refetchInterval: 30_000, retry: false });
  if (audit.error) return <ErrorState error={audit.error} />;
  if (audit.isPending) return <Skeleton className="h-96 rounded-card" />;
  if (audit.data.entries.length === 0) return <EmptyState title="The audit log is empty" />;
  return (
    <ul className="flex flex-col gap-1">
      {audit.data.entries.map((a) => (
        <AuditLine key={a.id} a={a} withName />
      ))}
    </ul>
  );
}
