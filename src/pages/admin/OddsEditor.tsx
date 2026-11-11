import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/DataTable";
import { Stack } from "@/components/layout/Stack";
import { Panel, Section } from "@/components/layout/Section";
import { Caption, Text } from "@/components/typography/Text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi, type Odds, type ServerResponse } from "@/lib/api";
import { eventKindLabel } from "@/lib/format";

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.01 ? 2 : 1)}%`;

const WEATHER_LABELS: Record<string, string> = { rainy: "Rainy", stormy: "Stormy", flooded: "Flooded", eclipsed: "Eclipsed" };
const INFEST_LABELS: Record<string, string> = { hoarding_bug: "Hoarding bug", nutcracker: "Nutcracker" };

const DEFAULTS: Odds = {
  no_event: 0.3,
  events: { weather: 50, indoor_fog: 10, infestation: 10, hardcore: 20, allow_twohanded: 10, no_weight: 10, sid: 10, meteor_shower: 10 },
  weather: { rainy: 2, stormy: 2, flooded: 1, eclipsed: 1 },
  infestation: { hoarding_bug: 1, nutcracker: 1 },
};

function WeightInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Input
      type="number"
      min={0}
      max={10000}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Math.max(0, Math.min(10000, Math.round(Number(e.target.value) || 0))))}
      className="h-8 w-24 text-right tabular-nums"
    />
  );
}

/** One weight table: rows with a weight input and the resulting share. */
function WeightTable({
  title,
  weights,
  labels,
  scale,
  muted,
  onChange,
}: {
  title: string;
  weights: Record<string, number>;
  labels: (k: string) => string;
  /** Share of all rolls this table splits (e.g. 70% for events). */
  scale: number;
  muted?: (k: string) => boolean;
  onChange: (k: string, v: number) => void;
}) {
  const keys = Object.keys(weights);
  const total = keys.filter((k) => !muted?.(k)).reduce((n, k) => n + weights[k], 0);
  return (
    <Table>
      <THead>
        <tr>
          <TH>{title}</TH>
          <TH align="right">Weight</TH>
          <TH align="right">Chance</TH>
        </tr>
      </THead>
      <TBody>
        {keys.map((k) => {
          const off = muted?.(k) ?? false;
          const share = !off && total > 0 ? (weights[k] / total) * scale : 0;
          return (
            <TR key={k}>
              <TD className={off ? "text-muted" : "text-fg"}>
                {labels(k)}
                {off && <Caption className="ml-2">hidden from random</Caption>}
              </TD>
              <TD align="right">
                <WeightInput label={`${labels(k)} weight`} value={weights[k]} onChange={(v) => onChange(k, v)} />
              </TD>
              <TD align="right" className="text-primary-300 tabular-nums">
                {pct(share)}
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
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
  const weatherShare = (() => {
    const total = Object.entries(odds.events).filter(([k]) => !hidden(k)).reduce((n, [, w]) => n + w, 0);
    return total > 0 && !hidden("weather") ? (odds.events.weather / total) * eventsShare : 0;
  })();
  const infestShare = (() => {
    const total = Object.entries(odds.events).filter(([k]) => !hidden(k)).reduce((n, [, w]) => n + w, 0);
    return total > 0 && !hidden("infestation") ? (odds.events.infestation / total) * eventsShare : 0;
  })();

  return (
    <Section title="Event odds">
      <Panel className="flex flex-col gap-4 p-4">
        <Caption className="text-body">
          Used by every random event roll (ranked, quick play, rooms set to Roll). Weights are relative. Hidden events drop out of ranked and random rolls and
          the others share their chance. Chances below are for ranked; quick play with "every event" also includes hidden ones.
        </Caption>

        <Stack direction="row" align="center" gap={3} wrap>
          <Text variant="title">No event</Text>
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            aria-label="No event chance in percent"
            value={Math.round(odds.no_event * 1000) / 10}
            onChange={(e) => setOdds({ ...odds, no_event: Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100 })}
            className="h-8 w-24 text-right tabular-nums"
          />
          <Caption>% of all rolls</Caption>
        </Stack>

        <div className="grid gap-4 lg:grid-cols-3">
          <WeightTable
            title={`Events (${pct(eventsShare)} of rolls)`}
            weights={odds.events}
            labels={eventKindLabel}
            scale={eventsShare}
            muted={hidden}
            onChange={(k, v) => setOdds({ ...odds, events: { ...odds.events, [k]: v } })}
          />
          <WeightTable
            title={`Weather (${pct(weatherShare)})`}
            weights={odds.weather}
            labels={(k) => WEATHER_LABELS[k] ?? k}
            scale={weatherShare}
            onChange={(k, v) => setOdds({ ...odds, weather: { ...odds.weather, [k]: v } })}
          />
          <WeightTable
            title={`Infestation (${pct(infestShare)})`}
            weights={odds.infestation}
            labels={(k) => INFEST_LABELS[k] ?? k}
            scale={infestShare}
            onChange={(k, v) => setOdds({ ...odds, infestation: { ...odds.infestation, [k]: v } })}
          />
        </div>

        {save.error && (
          <Text variant="caption" tone="danger" role="alert">
            {errText(save.error)}
          </Text>
        )}
        <Stack direction="row" gap={2}>
          <Button variant="primary" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            <Save aria-hidden />
            {save.isPending ? "Saving…" : "Save odds"}
          </Button>
          <Button variant="ghost" disabled={save.isPending} onClick={() => setOdds(DEFAULTS)}>
            <RotateCcw aria-hidden />
            Defaults
          </Button>
        </Stack>
      </Panel>
    </Section>
  );
}
