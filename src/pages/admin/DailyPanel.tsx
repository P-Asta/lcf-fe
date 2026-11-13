import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dices, Plus, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState } from "@/components/StateBlock";
import { ToolIcon } from "@/components/ToolIcon";
import { Stack } from "@/components/layout/Stack";
import { Panel, Section } from "@/components/layout/Section";
import { Caption, Text } from "@/components/typography/Text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi, type DailyAdminResponse, type DailySettings } from "@/lib/api";
import { eventKindLabel, eventLabel, fmtCountdown, fmtMoney, toolLabel } from "@/lib/format";

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

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

function Editor({ pw, data }: { pw: string; data: DailyAdminResponse }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<DailySettings>(data.settings);
  useEffect(() => setDraft(data.settings), [data.settings]);
  const done = (d: DailyAdminResponse) => {
    qc.setQueryData(["admin", "daily", pw], d);
    qc.invalidateQueries({ queryKey: ["daily"] });
  };
  const save = useMutation({ mutationFn: () => adminApi.setDaily(pw, draft), onSuccess: done });
  const reroll = useMutation({ mutationFn: () => adminApi.rerollDaily(pw), onSuccess: done });
  const busy = save.isPending || reroll.isPending;
  const err = save.error ?? reroll.error;
  const runs = data.best.length;
  const warn = runs > 0 ? `\n\n${runs} player(s) already played today: their runs are deleted.` : "";

  const setEvent = (i: number, kind: string, detail: string | null = null) =>
    setDraft({ ...draft, events: draft.events.map((e, j) => (j === i ? { kind, detail } : e)) });
  const setBan = (i: number, t: string) => setDraft({ ...draft, banned: draft.banned.map((b, j) => (j === i ? t : b)) });
  const unusedKind = data.event_kinds.find((k) => !draft.events.some((e) => e.kind === k)) ?? data.event_kinds[0];

  return (
    <Panel className="flex flex-col gap-4 p-4">
      <Stack direction="row" align="center" gap={4} wrap>
        <Stack gap={1}>
          <Text variant="title">Today: {data.day}</Text>
          <Caption>
            {data.locked ? "Closed until 00:01 UTC" : `Ends in ${fmtCountdown(data.ends_in)}`} · {runs} player(s) played ·{" "}
            {data.settings.moon} · {data.settings.events.map(eventLabel).join(", ") || "no event"} · banned {data.settings.banned.map(toolLabel).join(", ")}
          </Caption>
        </Stack>
        <Button
          className="w-full sm:ml-auto sm:w-auto"
          variant="secondary"
          disabled={busy}
          onClick={() => window.confirm(`Roll a new random challenge for today? Everyone sees the reveal again.${warn}`) && reroll.mutate()}
        >
          <Dices aria-hidden />
          {reroll.isPending ? "Rolling…" : "Re-roll random"}
        </Button>
      </Stack>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Caption>Moon</Caption>
          <OptionSelect label="Moon" value={draft.moon} onChange={(v) => setDraft({ ...draft, moon: v })} options={data.moons.map((m) => ({ value: m, label: m }))} />
        </div>
        <label className="flex flex-col gap-1">
          <Caption>Seed</Caption>
          <Input type="number" min={1} value={draft.seed} onChange={(e) => setDraft({ ...draft, seed: Number(e.target.value) || 1 })} />
        </label>
      </div>

      <Stack gap={2}>
        <Caption>Events (0 to 3)</Caption>
        {draft.events.map((e, i) => (
          <Stack key={i} direction="row" align="center" gap={2} wrap>
            <OptionSelect
              label={`Event ${i + 1}`}
              className="w-full sm:w-56"
              value={e.kind}
              onChange={(v) => setEvent(i, v)}
              options={data.event_kinds.map((k) => ({ value: k, label: eventKindLabel(k) }))}
            />
            {DETAILS[e.kind] && (
              <OptionSelect
                label={`Event ${i + 1} detail`}
                className="min-w-0 flex-1 sm:w-44 sm:flex-none"
                value={e.detail ?? ""}
                onChange={(v) => setEvent(i, e.kind, v || null)}
                options={DETAILS[e.kind].map(([v, l]) => ({ value: v, label: l }))}
              />
            )}
            <Button
              variant="ghost"
              size="iconSm"
              aria-label={`Remove event ${i + 1}`}
              onClick={() => setDraft({ ...draft, events: draft.events.filter((_, j) => j !== i) })}
            >
              <X aria-hidden />
            </Button>
          </Stack>
        ))}
        {draft.events.length < 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => setDraft({ ...draft, events: [...draft.events, { kind: unusedKind, detail: null }] })}
          >
            <Plus aria-hidden />
            Add event
          </Button>
        )}
      </Stack>

      <Stack gap={2}>
        <Caption>Banned tools</Caption>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {draft.banned.map((b, i) => (
            <div key={i} className="flex min-w-0 items-center gap-2 rounded-card bg-surface-2 p-2">
              <ToolIcon tool={b} className="size-9" />
              <OptionSelect
                label={`Banned tool ${i + 1}`}
                className="min-w-0 flex-1"
                value={b}
                onChange={(v) => setBan(i, v)}
                options={data.tools.map((t) => ({ value: t, label: toolLabel(t) }))}
              />
            </div>
          ))}
        </div>
      </Stack>

      {err && (
        <Text variant="caption" tone="danger" role="alert">
          {errText(err)}
        </Text>
      )}
      <Button
        variant="primary"
        className="w-full sm:w-fit"
        disabled={busy}
        onClick={() => window.confirm(`Replace today's challenge with these settings? Everyone sees the reveal again.${warn}`) && save.mutate()}
      >
        <Save aria-hidden />
        {save.isPending ? "Saving…" : "Save as today's challenge"}
      </Button>
    </Panel>
  );
}

export function DailyPanel({ pw }: { pw: string }) {
  const q = useQuery({ queryKey: ["admin", "daily", pw], queryFn: () => adminApi.daily(pw), refetchInterval: 30_000, retry: false });
  if (q.error) return <ErrorState error={q.error} />;
  if (q.isPending) return <Skeleton className="h-96 rounded-card" />;
  const top = q.data.first[0];
  return (
    <Section title="Daily challenge" aside={top ? `First play leader: ${top.name} ${fmtMoney(top.score)}` : undefined}>
      <Editor pw={pw} data={q.data} />
    </Section>
  );
}
