import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Power, PowerOff } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState } from "@/components/StateBlock";
import { Stack } from "@/components/layout/Stack";
import { Panel, Section } from "@/components/layout/Section";
import { Caption, Text } from "@/components/typography/Text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi, type EventConfig, type ServerResponse } from "@/lib/api";
import { OddsEditor } from "@/pages/admin/OddsEditor";
import { eventKindLabel } from "@/lib/format";

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const selectCls =
  "h-9 cursor-pointer rounded-pill bg-surface-2 px-4 text-body text-fg outline-none hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-primary-400";

const DETAILS: Record<string, [string, string][]> = {
  weather: [
    ["", "Random"],
    ["rainy", "Rainy"],
    ["stormy", "Stormy"],
    ["flooded", "Flooded"],
    ["eclipsed", "Eclipsed"],
  ],
  infestation: [
    ["", "Random"],
    ["hoarding_bug", "Hoarding bug"],
    ["nutcracker", "Nutcracker"],
  ],
};

/** Counts down locally between the 5 s refreshes. */
function useCountdown(seconds: number | null | undefined) {
  const [left, setLeft] = useState(seconds ?? null);
  useEffect(() => {
    setLeft(seconds ?? null);
    if (seconds == null) return;
    const started = Date.now();
    const t = setInterval(() => setLeft(Math.max(0, seconds - Math.floor((Date.now() - started) / 1000))), 1000);
    return () => clearInterval(t);
  }, [seconds]);
  return left;
}

const fmtLeft = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Shutdown({ pw, data }: { pw: string; data: ServerResponse }) {
  const qc = useQueryClient();
  const [minutes, setMinutes] = useState("15");
  const left = useCountdown(data.shutdown_in);
  const m = useMutation({
    mutationFn: (body: { minutes?: number; cancel?: boolean }) => adminApi.shutdown(pw, body),
    onSuccess: (d) => qc.setQueryData(["admin", "server", pw], d),
  });
  const s = data.stats;

  return (
    <Section title="Server" aside={`${s.online} online · ${s.matches} matches · ${s.rooms} rooms · ranked queue ${s.ranked.searching} · quick queue ${s.quick.searching}`}>
      <Panel className="flex flex-col gap-4 p-4">
        {left != null ? (
          <Stack direction="row" align="center" gap={4} wrap>
            <PowerOff aria-hidden className="size-6 text-danger" />
            <Stack gap={1}>
              <Text variant="title">Shutting down in {fmtLeft(left)}</Text>
              <Caption>Players were warned at 15 / 10 / 5 / 1 minutes. No new games start; running ones go on. At zero everyone is sent to the main menu.</Caption>
            </Stack>
            <Button variant="secondary" className="ml-auto" disabled={m.isPending} onClick={() => m.mutate({ cancel: true })}>
              Cancel shutdown
            </Button>
          </Stack>
        ) : (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Math.min(120, Math.max(1, Number(minutes) || 15));
              if (window.confirm(`Shut the server down in ${n} minute(s)? Players get warnings and cannot start new games meanwhile.`)) m.mutate({ minutes: n });
            }}
          >
            <Stack gap={1}>
              <Text variant="title">Scheduled shutdown</Text>
              <Caption>Warns everyone at 15 / 10 / 5 / 1 minutes, blocks new games, then sends players to the main menu and stops the server.</Caption>
            </Stack>
            <label className="ml-auto flex flex-col gap-1">
              <Caption>Minutes</Caption>
              <Input type="number" min={1} max={120} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-24" />
            </label>
            <Button type="submit" variant="primary" disabled={m.isPending}>
              <Power aria-hidden />
              Shut down
            </Button>
          </form>
        )}
        {m.error && (
          <Text variant="caption" tone="danger" role="alert">
            {errText(m.error)}
          </Text>
        )}
      </Panel>
    </Section>
  );
}

function Events({ pw, data }: { pw: string; data: ServerResponse }) {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (c: EventConfig) => adminApi.setEvents(pw, c),
    onSuccess: (d) => qc.setQueryData(["admin", "server", pw], d),
  });
  const ev = data.events;
  const set = (patch: Partial<EventConfig>) => save.mutate({ ...ev, ...patch });
  const toggle = (k: string) => set({ hidden: ev.hidden.includes(k) ? ev.hidden.filter((h) => h !== k) : [...ev.hidden, k] });
  const details = DETAILS[ev.quick_event];

  return (
    <Section title="Events">
      <Panel className="flex flex-col gap-4 p-4">
        <Stack gap={1}>
          <Text variant="title">Hidden events</Text>
          <Caption>Hidden events never come up in ranked or in random rolls. Rooms can still pick them by hand (shown dimmed in the game).</Caption>
        </Stack>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {data.event_kinds.map((k) => {
            const hidden = ev.hidden.includes(k);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={hidden}
                disabled={save.isPending}
                onClick={() => toggle(k)}
                className="flex h-10 cursor-pointer items-center justify-between gap-2 rounded-control bg-surface-2 px-3 text-body transition-colors hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-primary-400 disabled:cursor-wait"
              >
                <span className={hidden ? "text-muted" : "text-fg"}>{eventKindLabel(k)}</span>
                {hidden ? (
                  <Badge tone="danger">
                    <EyeOff aria-hidden className="size-3.5" />
                    Hidden
                  </Badge>
                ) : (
                  <Badge>In random</Badge>
                )}
              </button>
            );
          })}
        </div>

        <Stack gap={1}>
          <Text variant="title">Quick play event</Text>
          <Caption>Quick play is unrated, so it can use events ranked does not: every event (hidden ones too), the ranked rules, none, or one fixed event.</Caption>
        </Stack>
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Quick play event"
            value={ev.quick_event}
            disabled={save.isPending}
            onChange={(e) => set({ quick_event: e.target.value, quick_detail: null })}
            className={selectCls}
          >
            <option value="roll_all">Random - every event, hidden ones too</option>
            <option value="roll">Random - like ranked (no hidden events)</option>
            <option value="none">No event</option>
            {data.event_kinds.map((k) => (
              <option key={k} value={k}>
                Always: {eventKindLabel(k)}
              </option>
            ))}
          </select>
          {details && (
            <select
              aria-label="Quick play event detail"
              value={ev.quick_detail ?? ""}
              disabled={save.isPending}
              onChange={(e) => set({ quick_detail: e.target.value || null })}
              className={selectCls}
            >
              {details.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </div>
        {save.error && (
          <Text variant="caption" tone="danger" role="alert">
            {errText(save.error)}
          </Text>
        )}
      </Panel>
    </Section>
  );
}

export function ServerPanel({ pw }: { pw: string }) {
  const q = useQuery({ queryKey: ["admin", "server", pw], queryFn: () => adminApi.server(pw), refetchInterval: 5_000, retry: false });
  if (q.error) return <ErrorState error={q.error} />;
  if (q.isPending) return <Skeleton className="h-96 rounded-card" />;
  return (
    <Stack gap={8}>
      <Shutdown pw={pw} data={q.data} />
      <Events pw={pw} data={q.data} />
      <OddsEditor pw={pw} data={q.data} />
    </Stack>
  );
}
