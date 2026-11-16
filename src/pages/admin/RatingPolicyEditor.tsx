import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Stack } from "@/components/layout/Stack";
import { Caption, Text } from "@/components/typography/Text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi, DEFAULT_RATING_POLICY, type RatingPolicy, type ServerResponse } from "@/lib/api";

type Draft = { min_rd: string; hidden_rd: string; loss_reduction: string };
const toDraft = (p: RatingPolicy): Draft => ({ min_rd: String(p.min_rd), hidden_rd: String(p.hidden_rd), loss_reduction: String(p.loss_reduction * 100) });

export function RatingPolicyEditor({ pw, data }: { pw: string; data: ServerResponse }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const saved = toDraft(data.events.rating_policy ?? DEFAULT_RATING_POLICY);
  const values = draft ?? saved;
  const dirty = Object.keys(saved).some((key) => values[key as keyof Draft] !== saved[key as keyof Draft]);
  const invalid = Object.entries(values).some(([key, value]) => value.trim() === "" || !Number.isFinite(Number(value)) || (key === "loss_reduction" ? Number(value) < 0 || Number(value) > 100 : Number(value) <= 0 || Number(value) > 350));
  const save = useMutation({
    scope: { id: `admin-events-${pw}` },
    mutationFn: (rating_policy: RatingPolicy) => adminApi.setEvents(pw, {
      ...(qc.getQueryData<ServerResponse>(["admin", "server", pw])?.events ?? data.events), rating_policy,
    }),
    onSuccess: (response) => {
      qc.setQueryData(["admin", "server", pw], response);
      setDraft(null);
      for (const key of ["admin", "players", "leaderboard", "player", "ranks"]) void qc.invalidateQueries({ queryKey: [key] });
    },
  });
  return (
    <Stack gap={3}>
      <Stack gap={1}>
        <Text variant="title">Rating policy</Text>
        <Caption>Minimum RD limits rating certainty. Ratings at or above the hidden RD threshold show ?. Loss reduction reduces losses against hidden-rating opponents by this percentage. Changes also apply to running matches.</Caption>
      </Stack>
      <div className="grid gap-3 sm:grid-cols-3">
        {([
          ["min_rd", "Minimum RD"], ["hidden_rd", "Hidden rating RD"], ["loss_reduction", "Loss reduction (%)"],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex min-w-0 flex-col gap-1">
            <Caption>{label}</Caption>
            <Input aria-label={label} type="number" min={key === "loss_reduction" ? 0 : undefined} max={key === "loss_reduction" ? 100 : 350} step="any" inputMode="decimal" value={values[key]} disabled={save.isPending} onChange={(e) => { save.reset(); setDraft({ ...values, [key]: e.target.value }); }} />
          </label>
        ))}
      </div>
      {invalid && <Text variant="caption" tone="danger" role="alert">RD values must be above 0 and at most 350. Loss reduction must be from 0 to 100%.</Text>}
      {save.error && <Text variant="caption" tone="danger" role="alert">{save.error.message}</Text>}
      <Stack direction="row" align="center" gap={2} wrap>
        <Button variant="primary" disabled={!dirty || invalid || save.isPending} onClick={() => save.mutate({ min_rd: Number(values.min_rd), hidden_rd: Number(values.hidden_rd), loss_reduction: Number(values.loss_reduction) / 100 })}>{save.isPending ? "Saving…" : "Save rating policy"}</Button>
        {dirty && <Caption>Unsaved changes</Caption>}
      </Stack>
    </Stack>
  );
}
