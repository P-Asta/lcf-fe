import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Plus, Power, PowerOff, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState } from "@/components/StateBlock";
import { Stack } from "@/components/layout/Stack";
import { Panel, Section } from "@/components/layout/Section";
import { Caption, Text } from "@/components/typography/Text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi, type EventConfig, type RankedEnemyRule, type ServerResponse, type ToolProtection } from "@/lib/api";
import { RANKS } from "@/lib/ranks";
import { OddsEditor } from "@/pages/admin/OddsEditor";
import { RatingPolicyEditor } from "@/pages/admin/RatingPolicyEditor";
import { eventKindLabel, toolLabel } from "@/lib/format";

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

const DEFAULT_ENEMY_RULES: RankedEnemyRule[] = [
  { min_rank: "int3", max_rank: "pt1", spawn_mult: 1, min_inside: 0 },
  { min_rank: "emp3", max_rank: "ldr1", spawn_mult: 1, min_inside: 0 },
  { min_rank: "boss3", max_rank: "zed", spawn_mult: 2, min_inside: 1 },
];
const RANK_OPTIONS = [...RANKS].reverse().map((r) => ({ value: r.id, label: r.name }));
type RankedEnemyDraft = Omit<RankedEnemyRule, "spawn_mult" | "min_inside"> & { spawn_mult: string; min_inside: string };
const enemyRuleDraft = (rule: RankedEnemyRule): RankedEnemyDraft => ({ ...rule, spawn_mult: Number.isInteger(rule.spawn_mult) ? rule.spawn_mult.toFixed(1) : String(rule.spawn_mult), min_inside: String(rule.min_inside) });

function RankedEnemyRules({ pw, data }: { pw: string; data: ServerResponse }) {
  const qc = useQueryClient();
  // Keep edits across the server panel's periodic refreshes and unrelated event saves.
  const [draft, setDraft] = useState<RankedEnemyDraft[] | null>(null);
  const saved = (data.events.ranked_enemy_rules ?? DEFAULT_ENEMY_RULES).map(enemyRuleDraft);
  const rules = draft ?? saved;
  const dirty = JSON.stringify(rules) !== JSON.stringify(saved);
  const invalidRange = rules.some((rule) => RANKS.findIndex((r) => r.id === rule.min_rank) < RANKS.findIndex((r) => r.id === rule.max_rank));
  const invalidNumbers = rules.some((rule) => {
    const spawn = Number(rule.spawn_mult);
    const inside = Number(rule.min_inside);
    return rule.spawn_mult.trim() === "" || !Number.isFinite(spawn) || spawn < 1 || spawn > 100
      || rule.min_inside.trim() === "" || !Number.isInteger(inside) || inside < 0 || inside > 100;
  });
  const invalid = invalidRange || invalidNumbers;
  const save = useMutation({
    scope: { id: `admin-events-${pw}` },
    mutationFn: (ranked_enemy_rules: RankedEnemyRule[]) => adminApi.setEvents(pw, {
      ...(qc.getQueryData<ServerResponse>(["admin", "server", pw])?.events ?? data.events), ranked_enemy_rules,
    }),
    onSuccess: (d) => {
      qc.setQueryData(["admin", "server", pw], d);
      setDraft(null);
    },
  });
  const edit = (index: number, patch: Partial<RankedEnemyDraft>) => {
    save.reset();
    setDraft(rules.map((rule, i) => i === index ? { ...rule, ...patch } : rule));
  };

  return (
    <Stack gap={3}>
      <Stack gap={1}>
        <Text variant="title">Ranked enemy rules</Text>
        <Caption>
          Applies to newly matched Ranked games, using the lower of the two players&apos; ranks. Ranges include both ends; the first matching row wins.
          Unmatched ranks use 1x enemies and the default inside minimum. A higher vanilla inside minimum still wins.
        </Caption>
      </Stack>
      {rules.map((rule, index) => (
        <fieldset key={index} className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="mb-2 text-caption text-muted">Rule {index + 1}</legend>
          <Stack gap={1}>
            <Caption>From rank</Caption>
            <OptionSelect label={`Rule ${index + 1} minimum rank`} value={rule.min_rank} disabled={save.isPending} options={RANK_OPTIONS} onChange={(v) => edit(index, { min_rank: v })} />
          </Stack>
          <Stack gap={1}>
            <Caption>Through rank</Caption>
            <OptionSelect label={`Rule ${index + 1} maximum rank`} value={rule.max_rank} disabled={save.isPending} options={RANK_OPTIONS} onChange={(v) => edit(index, { max_rank: v })} />
          </Stack>
          <Stack gap={1}>
            <Caption>Enemy spawn (1–100x)</Caption>
            <Input type="number" min={1} max={100} step="any" inputMode="decimal" aria-label={`Rule ${index + 1} enemy spawn`} value={rule.spawn_mult} disabled={save.isPending} onChange={(e) => edit(index, { spawn_mult: e.target.value })} onBlur={(e) => {
              const value = e.target.value;
              const spawn = Number(value);
              if (value.trim() !== "" && Number.isInteger(spawn) && spawn >= 1 && spawn <= 100 && value !== spawn.toFixed(1)) edit(index, { spawn_mult: spawn.toFixed(1) });
            }} />
          </Stack>
          <Stack gap={1}>
            <Caption>Minimum inside (0 = default)</Caption>
            <Input type="number" min={0} max={100} step={1} inputMode="numeric" aria-label={`Rule ${index + 1} minimum inside`} value={rule.min_inside} disabled={save.isPending} onChange={(e) => edit(index, { min_inside: e.target.value })} />
          </Stack>
          <Button variant="ghost" className="w-fit" aria-label={`Remove rule ${index + 1}`} disabled={save.isPending} onClick={() => { save.reset(); setDraft(rules.filter((_, i) => i !== index)); }}>
            Remove
          </Button>
        </fieldset>
      ))}
      {invalidRange && <Text variant="caption" tone="danger" role="alert">Each range must start at or below its ending rank.</Text>}
      {invalidNumbers && <Text variant="caption" tone="danger" role="alert">Enter an enemy spawn multiplier from 1 to 100 and a whole-number inside minimum from 0 to 100.</Text>}
      {save.error && <Text variant="caption" tone="danger" role="alert">{errText(save.error)}</Text>}
      <Stack direction="row" align="center" gap={2} wrap>
        <Button variant="secondary" disabled={save.isPending} onClick={() => { save.reset(); setDraft([...rules, { min_rank: "int3", max_rank: "zed", spawn_mult: "1.0", min_inside: "0" }]); }}>
          <Plus aria-hidden /> Add range
        </Button>
        <Button variant="primary" disabled={!dirty || invalid || save.isPending} onClick={() => {
          if (!invalid) save.mutate(rules.map((rule) => ({ ...rule, spawn_mult: Number(rule.spawn_mult), min_inside: Number(rule.min_inside) })));
        }}>
          <Save aria-hidden /> {save.isPending ? "Saving…" : "Save enemy rules"}
        </Button>
        {dirty && <Caption>Unsaved changes</Caption>}
      </Stack>
    </Stack>
  );
}

const DEFAULT_TOOLS = ["shovel", "cruiser", "jetpack", "flash", "keys", "beltbag", "stungrenade", "weedkiller", "tzp", "ladder", "boombox", "spray_paint"];
const DEFAULT_MOONS = ["Experimentation", "Assurance", "Vow", "Offense", "March", "Adamance", "Rend", "Dine", "Titan", "Artifice", "Embrion"];
const DEFAULT_TOOL_PROTECTION: ToolProtection = {
  moon_locks: [
    { tool: "shovel", moons: ["Adamance", "Offense", "Rend", "Dine", "Titan", "Artifice"] },
    { tool: "weedkiller", moons: ["Adamance", "Dine"] },
  ],
  conflicts: [
    { tools: ["jetpack", "cruiser"], moons: ["Artifice", "Dine"] },
    { tools: ["jetpack", "weedkiller"], moons: ["Artifice"] },
    { tools: ["jetpack", "ladder"], moons: ["Titan"] },
  ],
};

function MoonScope({ label, value, moons, disabled, onChange }: { label: string; value: string[]; moons: string[]; disabled: boolean; onChange: (v: string[]) => void }) {
  return (
    <Stack gap={2}>
      <Caption>Moons</Caption>
      <OptionSelect
        label={`${label} scope`}
        value={value.length ? "selected" : "all"}
        disabled={disabled}
        options={[{ value: "all", label: "All moons" }, ...(moons.length ? [{ value: "selected", label: "Selected moons" }] : [])]}
        onChange={(v) => onChange(v === "all" ? [] : [moons[0]])}
      />
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from(new Set([...moons, ...value])).map((moon) => (
            <label key={moon} className="flex items-center gap-2 text-body">
              <input
                type="checkbox"
                aria-label={`${label} ${moon}`}
                className="size-4 accent-primary-500"
                checked={value.includes(moon)}
                disabled={disabled || (value.length === 1 && value.includes(moon))}
                onChange={(e) => onChange(e.target.checked ? [...value, moon] : value.filter((m) => m !== moon))}
              />
              {moon}
            </label>
          ))}
        </div>
      )}
    </Stack>
  );
}

function ToolProtectionEditor({ pw, data }: { pw: string; data: ServerResponse }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<ToolProtection | null>(null);
  const saved = data.events.tool_protection ?? DEFAULT_TOOL_PROTECTION;
  const policy = draft ?? saved;
  const tools = data.tools ?? DEFAULT_TOOLS;
  const moons = data.moons ?? DEFAULT_MOONS;
  const options = tools.map((tool) => ({ value: tool, label: toolLabel(tool) }));
  const dirty = JSON.stringify(policy) !== JSON.stringify(saved);
  const invalid = policy.conflicts.some((rule) => rule.tools[0] === rule.tools[1]);
  const save = useMutation({
    scope: { id: `admin-events-${pw}` },
    mutationFn: (tool_protection: ToolProtection) => adminApi.setEvents(pw, {
      ...(qc.getQueryData<ServerResponse>(["admin", "server", pw])?.events ?? data.events), tool_protection,
    }),
    onSuccess: (d) => {
      qc.setQueryData(["admin", "server", pw], d);
      setDraft(null);
    },
  });
  const edit = (next: ToolProtection) => { save.reset(); setDraft(next); };
  const setLock = (index: number, patch: Partial<ToolProtection["moon_locks"][number]>) =>
    edit({ ...policy, moon_locks: policy.moon_locks.map((rule, i) => i === index ? { ...rule, ...patch } : rule) });
  const setConflict = (index: number, patch: Partial<ToolProtection["conflicts"][number]>) =>
    edit({ ...policy, conflicts: policy.conflicts.map((rule, i) => i === index ? { ...rule, ...patch } : rule) });

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Text variant="title">Essential Tool Protection</Text>
        <Caption>
          Locked tools cannot be banned on their selected moons. For each conflicting pair, banning either tool protects the other.
          Choose all moons or specific moons for each rule. Save to apply to new matches; running matches keep their rules.
        </Caption>
      </Stack>
      {policy.moon_locks.map((rule, index) => (
        <fieldset key={index} className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <legend className="mb-2 text-caption text-muted">Locked tool {index + 1}</legend>
          <Stack gap={1}>
            <Caption>Tool</Caption>
            <OptionSelect label={`Lock ${index + 1} tool`} value={rule.tool} options={options} disabled={save.isPending} onChange={(tool) => setLock(index, { tool })} />
          </Stack>
          <MoonScope label={`Lock ${index + 1}`} value={rule.moons} moons={moons} disabled={save.isPending} onChange={(next) => setLock(index, { moons: next })} />
          <Button variant="ghost" className="w-fit" aria-label={`Remove lock ${index + 1}`} disabled={save.isPending} onClick={() => edit({ ...policy, moon_locks: policy.moon_locks.filter((_, i) => i !== index) })}>Remove</Button>
        </fieldset>
      ))}
      <Button variant="secondary" className="w-fit" disabled={save.isPending || tools.length === 0} onClick={() => edit({ ...policy, moon_locks: [...policy.moon_locks, { tool: tools[0], moons: [] }] })}>
        <Plus aria-hidden /> Add locked tool
      </Button>
      {policy.conflicts.map((rule, index) => (
        <fieldset key={index} className="grid min-w-0 gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-caption text-muted">Conflicting pair {index + 1}</legend>
          <Stack gap={1}>
            <Caption>First tool</Caption>
            <OptionSelect label={`Conflict ${index + 1} first tool`} value={rule.tools[0]} options={options} disabled={save.isPending} onChange={(tool) => setConflict(index, { tools: [tool, rule.tools[1]] })} />
          </Stack>
          <Stack gap={1}>
            <Caption>Second tool</Caption>
            <OptionSelect label={`Conflict ${index + 1} second tool`} value={rule.tools[1]} options={options} disabled={save.isPending} onChange={(tool) => setConflict(index, { tools: [rule.tools[0], tool] })} />
          </Stack>
          <div className="sm:col-span-2"><MoonScope label={`Conflict ${index + 1}`} value={rule.moons} moons={moons} disabled={save.isPending} onChange={(next) => setConflict(index, { moons: next })} /></div>
          <Button variant="ghost" className="w-fit" aria-label={`Remove conflict ${index + 1}`} disabled={save.isPending} onClick={() => edit({ ...policy, conflicts: policy.conflicts.filter((_, i) => i !== index) })}>Remove</Button>
        </fieldset>
      ))}
      <Stack direction="row" align="center" gap={2} wrap>
        <Button variant="secondary" disabled={save.isPending || tools.length < 2} onClick={() => edit({ ...policy, conflicts: [...policy.conflicts, { tools: [tools[0], tools[1]], moons: [] }] })}>
          <Plus aria-hidden /> Add conflicting pair
        </Button>
        <Button variant="primary" disabled={!dirty || invalid || save.isPending} onClick={() => save.mutate(policy)}>
          <Save aria-hidden /> {save.isPending ? "Saving…" : "Save tool protection"}
        </Button>
        {dirty && <Caption>Unsaved changes</Caption>}
      </Stack>
      {invalid && <Text variant="caption" tone="danger" role="alert">Choose two different tools for each conflicting pair.</Text>}
      {save.error && <Text variant="caption" tone="danger" role="alert">{errText(save.error)}</Text>}
    </Stack>
  );
}

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
    scope: { id: `admin-events-${pw}` },
    mutationFn: (patch: Partial<EventConfig>) => adminApi.setEvents(pw, {
      ...(qc.getQueryData<ServerResponse>(["admin", "server", pw])?.events ?? data.events), ...patch,
    }),
    onSuccess: (d) => qc.setQueryData(["admin", "server", pw], d),
  });
  const ev = data.events;
  const set = (patch: Partial<EventConfig>) => save.mutate(patch);
  const toggle = (k: string) => set({ hidden: ev.hidden.includes(k) ? ev.hidden.filter((h) => h !== k) : [...ev.hidden, k] });
  const details = DETAILS[ev.quick_event];

  return (
    <Section title="Events">
      <Panel className="flex flex-col gap-4 p-4">
        <Stack gap={1}>
          <Text variant="title">Hidden events</Text>
          <Caption>Hidden events never come up in ranked, in random rolls, or as seed bonus events, and the event slot machine does not show them. Rooms can still pick them by hand (shown dimmed in the game).</Caption>
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
          <Text variant="title">Secret Vote</Text>
          <Caption>During tool bans, show only who is choosing or has locked in. Reveal tool choices once voting ends.</Caption>
        </Stack>
        <div className="flex flex-wrap gap-3">
          <Stack gap={1} className="w-full sm:w-72">
            <Caption>Ranked</Caption>
            <OptionSelect
              label="Ranked Secret Vote"
              className="w-full"
              value={(ev.ranked_secret_vote ?? true) ? "on" : "off"}
              disabled={save.isPending}
              onChange={(v) => set({ ranked_secret_vote: v === "on" })}
              options={[{ value: "on", label: "On" }, { value: "off", label: "Off" }]}
            />
          </Stack>
          <Stack gap={1} className="w-full sm:w-72">
            <Caption>Quick play</Caption>
            <OptionSelect
              label="Quick play Secret Vote"
              className="w-full"
              value={(ev.quick_secret_vote ?? false) ? "on" : "off"}
              disabled={save.isPending}
              onChange={(v) => set({ quick_secret_vote: v === "on" })}
              options={[{ value: "on", label: "On" }, { value: "off", label: "Off" }]}
            />
          </Stack>
        </div>

        <RankedEnemyRules pw={pw} data={data} />
        <ToolProtectionEditor pw={pw} data={data} />
        <RatingPolicyEditor pw={pw} data={data} />

        <Stack gap={1}>
          <Text variant="title">Quick play preset</Text>
          <Caption>
            The rules of every quick play match, the same presets as the custom rooms. Default: the ranked rules. Monster hunter: 20x enemies with no
            limits and nothing invincible, 20+ inside, 1 life, Wipe off, instant takeoff and landing, most kills wins, no tool bans and no event. Speedrun: the first to bring 20% of the
            moon&apos;s scrap back to the ship wins.
          </Caption>
        </Stack>
        <OptionSelect
          label="Quick play preset"
          className="w-full sm:w-72"
          value={ev.quick_preset ?? "default"}
          disabled={save.isPending}
          onChange={(v) => set({ quick_preset: v })}
          options={[
            { value: "default", label: "Default (ranked rules)" },
            { value: "hunter", label: "Monster hunter" },
            { value: "speedrun", label: "Speedrun (20%)" },
            { value: "augment", label: "Augment" },
          ]}
        />
        <Stack gap={1}>
          <Text variant="title">Quick play event</Text>
          <Caption>Quick play is unrated, so it can use events ranked does not: every event (hidden ones too), the ranked rules, none, or one fixed event.</Caption>
        </Stack>
        <div className="flex flex-wrap items-center gap-3">
          <OptionSelect
            label="Quick play event"
            className="w-full sm:w-80"
            value={ev.quick_event}
            disabled={save.isPending}
            onChange={(v) => set({ quick_event: v, quick_detail: null })}
            options={[
              { value: "roll_all", label: "Random - every event, hidden ones too" },
              { value: "roll", label: "Random - like ranked (no hidden events)" },
              { value: "none", label: "No event" },
              ...data.event_kinds.map((k) => ({ value: k, label: `Always: ${eventKindLabel(k)}` })),
            ]}
          />
          {details && (
            <OptionSelect
              label="Quick play event detail"
              className="w-full sm:w-44"
              value={ev.quick_detail ?? ""}
              disabled={save.isPending}
              onChange={(v) => set({ quick_detail: v || null })}
              options={details.map(([v, l]) => ({ value: v, label: l }))}
            />
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
