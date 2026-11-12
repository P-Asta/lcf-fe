import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EyeOff, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Stack } from "@/components/layout/Stack";
import { Panel, Section } from "@/components/layout/Section";
import { Caption, Label, Text } from "@/components/typography/Text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi, type Odds, type ServerResponse } from "@/lib/api";
import { eventKindLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.01 ? 2 : 1)}%`;

const WEATHER_LABELS: Record<string, string> = { rainy: "Rainy", stormy: "Stormy", flooded: "Flooded", eclipsed: "Eclipsed" };
const INFEST_LABELS: Record<string, string> = { hoarding_bug: "Hoarding bug", nutcracker: "Nutcracker" };

const DEFAULTS: Odds = {
  no_event: 0.3,
  events: { weather: 50, indoor_fog: 10, infestation: 10, hardcore: 20, allow_twohanded: 10, no_weight: 10, sid: 10, meteor_shower: 10, booombers: 10, outside_meta: 10, no_fire_exit: 10 },
  weather: { rainy: 2, stormy: 2, flooded: 1, eclipsed: 1 },
  infestation: { hoarding_bug: 1, nutcracker: 1 },
};

const clampWeight = (v: string) => Math.max(0, Math.min(10000, Math.round(Number(v) || 0)));

function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: string) => void; suffix?: string }) {
  return (
    <div className="relative w-24 shrink-0">
      <Input
        type="number"
        min={0}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("h-8 bg-surface-2 text-right tabular-nums hover:bg-surface-3", suffix ? "pr-8 pl-3" : "px-3")}
      />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-caption text-muted">{suffix}</span>}
    </div>
  );
}

/** Weight input, a bar for the resulting chance, and the chance itself. */
function OddsRow({ label, weight, share, max, off, onChange }: { label: string; weight: number; share: number; max: number; off?: boolean; onChange: (v: number) => void }) {
  return (
    <div className="grid h-11 grid-cols-[minmax(0,9rem)_auto_minmax(0,1fr)_3.5rem] items-center gap-3">
      <span className={cn("flex min-w-0 items-center gap-1 truncate text-body", off ? "text-muted" : "text-fg")}>
        {off && <EyeOff aria-label="Hidden from random rolls" className="size-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </span>
      <NumberField label={`${label} weight`} value={weight} onChange={(v) => onChange(clampWeight(v))} />
      <span className="h-2 overflow-hidden rounded-pill bg-surface-3" aria-hidden>
        <span className="block h-full rounded-pill bg-primary-500 transition-[width] duration-200" style={{ width: `${max > 0 ? (share / max) * 100 : 0}%` }} />
      </span>
      <span className={cn("text-right text-body tabular-nums", off ? "text-muted" : "text-primary-300")}>{off ? "-" : pct(share)}</span>
    </div>
  );
}

function Group({
  title,
  share,
  weights,
  labels,
  hidden,
  columns,
  order,
  onChange,
}: {
  title: string;
  /** Chance of all rolls that this group splits. */
  share: number;
  weights: Record<string, number>;
  labels: (k: string) => string;
  hidden?: (k: string) => boolean;
  columns?: boolean;
  /** Display order (the game's); keys missing from it go last. */
  order?: string[];
  onChange: (k: string, v: number) => void;
}) {
  const rank = (k: string) => (order && order.includes(k) ? order.indexOf(k) : 999);
  const keys = Object.keys(weights).sort((a, b) => rank(a) - rank(b));
  const total = keys.filter((k) => !hidden?.(k)).reduce((n, k) => n + weights[k], 0);
  const shareOf = (k: string) => (!hidden?.(k) && total > 0 ? (weights[k] / total) * share : 0);
  const max = Math.max(...keys.map(shareOf), 0);
  return (
    <div className="flex flex-col gap-2">
      <Stack direction="row" align="baseline" justify="between" gap={3}>
        <Label>{title}</Label>
        <Caption className="tabular-nums">{pct(share)} of rolls</Caption>
      </Stack>
      <div className={cn("grid gap-x-8", columns && "lg:grid-cols-2")}>
        {keys.map((k) => (
          <OddsRow key={k} label={labels(k)} weight={weights[k]} share={shareOf(k)} max={max} off={hidden?.(k)} onChange={(v) => onChange(k, v)} />
        ))}
      </div>
    </div>
  );
}

/** Admin: the random event roll's odds (no event share, event / weather / infestation weights). */
export function OddsEditor({ pw, data }: { pw: string; data: ServerResponse }) {
  const qc = useQueryClient();
  const [odds, setOdds] = useState<Odds>(data.events.odds);
  useEffect(() => setOdds(data.events.odds), [data.events.odds]);
  const dirty = useMemo(() => JSON.stringify(odds) !== JSON.stringify(data.events.odds), [odds, data.events.odds]);
  const save = useMutation({
    mutationFn: () => adminApi.setEvents(pw, { ...data.events, odds }),
    onSuccess: (d) => qc.setQueryData(["admin", "server", pw], d),
  });

  const hidden = (k: string) => data.events.hidden.includes(k);
  const eventsShare = 1 - odds.no_event;
  const visibleTotal = Object.entries(odds.events).filter(([k]) => !hidden(k)).reduce((n, [, w]) => n + w, 0);
  const shareOf = (k: string) => (!hidden(k) && visibleTotal > 0 ? (odds.events[k] / visibleTotal) * eventsShare : 0);

  return (
    <Section title="Event odds">
      <Panel className="flex flex-col gap-6 p-5">
        <Caption className="text-body">
          Every random event roll (ranked, quick play, rooms set to Roll). Weights are relative; hidden events drop out and the others share their chance.
        </Caption>

        <Stack gap={2}>
          <Stack direction="row" align="center" justify="between" gap={4} wrap>
            <Stack direction="row" align="center" gap={3}>
              <Text variant="title">No event</Text>
              <NumberField
                label="No event chance in percent"
                value={Math.round(odds.no_event * 1000) / 10}
                suffix="%"
                onChange={(v) => setOdds({ ...odds, no_event: Math.max(0, Math.min(100, Number(v) || 0)) / 100 })}
              />
            </Stack>
            <Stack direction="row" align="center" gap={2}>
              <Badge>No event {pct(odds.no_event)}</Badge>
              <Badge tone="accent">Events {pct(eventsShare)}</Badge>
            </Stack>
          </Stack>
          <div className="flex h-3 overflow-hidden rounded-pill bg-surface-3" aria-hidden>
            <span className="h-full bg-surface-3" style={{ width: `${odds.no_event * 100}%` }} />
            <span className="h-full bg-primary-500" style={{ width: `${eventsShare * 100}%` }} />
          </div>
        </Stack>

        <Group
          title="Events"
          share={eventsShare}
          weights={odds.events}
          labels={eventKindLabel}
          hidden={hidden}
          columns
          order={data.event_kinds}
          onChange={(k, v) => setOdds({ ...odds, events: { ...odds.events, [k]: v } })}
        />

        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
          <Group
            title="Weather"
            share={shareOf("weather")}
            weights={odds.weather}
            labels={(k) => WEATHER_LABELS[k] ?? k}
            order={Object.keys(WEATHER_LABELS)}
            onChange={(k, v) => setOdds({ ...odds, weather: { ...odds.weather, [k]: v } })}
          />
          <Group
            title="Infestation"
            share={shareOf("infestation")}
            weights={odds.infestation}
            labels={(k) => INFEST_LABELS[k] ?? k}
            order={Object.keys(INFEST_LABELS)}
            onChange={(k, v) => setOdds({ ...odds, infestation: { ...odds.infestation, [k]: v } })}
          />
        </div>

        {save.error && (
          <Text variant="caption" tone="danger" role="alert">
            {errText(save.error)}
          </Text>
        )}
        <Stack direction="row" align="center" gap={2}>
          <Button variant="primary" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            <Save aria-hidden />
            {save.isPending ? "Saving…" : "Save odds"}
          </Button>
          <Button variant="ghost" disabled={save.isPending} onClick={() => setOdds(DEFAULTS)}>
            <RotateCcw aria-hidden />
            Defaults
          </Button>
          {dirty && <Caption>Unsaved changes</Caption>}
        </Stack>
      </Panel>
    </Section>
  );
}
