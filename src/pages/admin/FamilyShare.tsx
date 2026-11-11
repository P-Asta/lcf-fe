import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ExternalLink, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/DataTable";
import { SearchField } from "@/components/SearchField";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { EmptyState, ErrorState } from "@/components/StateBlock";
import { Stack } from "@/components/layout/Stack";
import { Panel } from "@/components/layout/Section";
import { Caption, Text } from "@/components/typography/Text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi, type FamilyEntry } from "@/lib/api";
import { fmtDate, fmtTime } from "@/lib/format";

const fmtWhen = (unix: number) => (unix > 0 ? `${fmtDate(unix)} ${fmtTime(unix)}` : "-");
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

const SteamLink = ({ id, label }: { id: string; label?: string | null }) => (
  <a
    href={`https://steamcommunity.com/profiles/${id}`}
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-1 text-primary-300 hover:text-primary-200"
  >
    <span className="truncate">{label || id}</span>
    <ExternalLink aria-hidden className="size-3 shrink-0" />
  </a>
);

type Filter = "pending" | "verified" | "all";

/** Family-shared accounts that tried to log in; verifying one lets it play. */
export function FamilyShare({ pw }: { pw: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "family", pw], queryFn: () => adminApi.family(pw), refetchInterval: 30_000, retry: false });
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "family"] });
  const verify = useMutation({
    mutationFn: ({ id, v }: { id: string; v: boolean }) => adminApi.setFamilyVerified(pw, id, v),
    onSettled: refresh,
  });
  const dismiss = useMutation({ mutationFn: (id: string) => adminApi.deleteFamily(pw, id), onSettled: refresh });

  const all = q.data?.entries ?? [];
  const pending = all.filter((e) => !e.verified).length;
  const list = useMemo(() => {
    const s = query.trim().toLowerCase();
    return all
      .filter((e) => filter === "all" || (filter === "pending" ? !e.verified : e.verified))
      .filter((e) => !s || e.name.toLowerCase().includes(s) || e.steam_id.includes(s) || e.owner_steam_id.includes(s) || e.last_ip.includes(s));
  }, [all, filter, query]);

  if (q.error) return <ErrorState error={q.error} />;
  if (q.isPending) return <Skeleton className="h-96 rounded-card" />;

  const err = verify.error ?? dismiss.error;

  return (
    <Stack gap={4}>
      <Panel className="flex flex-col gap-1 p-4">
        <Text variant="body">
          Accounts playing on a <span className="text-fg">family-shared</span> copy of Lethal Company are refused at login and listed here. Verify an account to
          let it play; unverifying kicks it if it is online.
        </Text>
        {q.data.allow_all && (
          <Text variant="caption" tone="danger">
            LCF_ALLOW_FAMILY_SHARING is on, so every family-shared account can play right now and this list is only informational.
          </Text>
        )}
      </Panel>

      <Stack direction="row" align="center" justify="between" gap={4} wrap>
        <SegmentedTabs
          label="Filter family-shared accounts"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "pending", label: `Pending (${pending})` },
            { value: "verified", label: `Verified (${all.length - pending})` },
            { value: "all", label: "All" },
          ]}
        />
        <SearchField value={query} onChange={setQuery} placeholder="Name, Steam ID or IP" />
      </Stack>

      {err && (
        <Text variant="caption" tone="danger" role="alert">
          {errText(err)}
        </Text>
      )}

      {list.length === 0 ? (
        <EmptyState icon={Users} title={filter === "pending" ? "No pending family-shared accounts" : "Nothing here"} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Account</TH>
              <TH>Game owner</TH>
              <TH align="right">Tries</TH>
              <TH>Last try</TH>
              <TH>IP</TH>
              <TH>Status</TH>
              <TH align="right">
                <span className="sr-only">Actions</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {list.map((e) => (
              <Row
                key={e.steam_id}
                e={e}
                busy={verify.isPending || dismiss.isPending}
                onVerify={(v) => verify.mutate({ id: e.steam_id, v })}
                onDismiss={() => {
                  if (window.confirm(`Remove ${e.name || e.steam_id} from this list? If they try again they show up as pending.`)) dismiss.mutate(e.steam_id);
                }}
              />
            ))}
          </TBody>
        </Table>
      )}
    </Stack>
  );
}

function Row({ e, busy, onVerify, onDismiss }: { e: FamilyEntry; busy: boolean; onVerify: (v: boolean) => void; onDismiss: () => void }) {
  return (
    <TR>
      <TD>
        <span className="flex min-w-0 items-center gap-2">
          <Avatar src={e.avatar} name={e.name} size="sm" />
          <Stack gap={1} className="min-w-0">
            <span className="truncate">{e.name || "Unknown"}</span>
            <Caption className="tabular-nums">
              <SteamLink id={e.steam_id} />
            </Caption>
          </Stack>
        </span>
      </TD>
      <TD>
        <Stack gap={1} className="min-w-0">
          {e.owner_name && <span className="truncate">{e.owner_name}</span>}
          <Caption className="tabular-nums">
            <SteamLink id={e.owner_steam_id} />
          </Caption>
        </Stack>
      </TD>
      <TD align="right" className="tabular-nums">
        {e.attempts}
      </TD>
      <TD className="text-muted">
        <span title={`First try ${fmtWhen(e.first_seen)}`}>{fmtWhen(e.last_seen)}</span>
      </TD>
      <TD className="text-muted tabular-nums">{e.last_ip || "-"}</TD>
      <TD>
        {e.verified ? (
          <Badge tone="accent" title={`Verified ${fmtWhen(e.verified_at)}`}>
            <BadgeCheck aria-hidden className="size-3.5" />
            Verified
          </Badge>
        ) : (
          <Badge>Pending</Badge>
        )}
      </TD>
      <TD align="right">
        <span className="inline-flex gap-1">
          {e.verified ? (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onVerify(false)}>
              Unverify
            </Button>
          ) : (
            <Button size="sm" variant="primary" disabled={busy} onClick={() => onVerify(true)}>
              <BadgeCheck aria-hidden />
              Verify
            </Button>
          )}
          <Button size="sm" variant="ghost" disabled={busy} onClick={onDismiss}>
            Remove
          </Button>
        </span>
      </TD>
    </TR>
  );
}
