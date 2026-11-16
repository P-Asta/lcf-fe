import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Caption, Text } from "@/components/typography/Text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi, DEFAULT_RATING_POLICY, type AdminPlayer } from "@/lib/api";

export function PlayerRdEditor({ pw, player }: { pw: string; player: AdminPlayer }) {
  const qc = useQueryClient();
  const server = useQuery({ queryKey: ["admin", "server", pw], queryFn: () => adminApi.server(pw), refetchInterval: 5_000, retry: false });
  const floor = (server.data?.events.rating_policy ?? DEFAULT_RATING_POLICY).min_rd;
  const stored = player.stored_rd ?? player.rd;
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? String(stored);
  const rd = Number(value);
  const invalid = value.trim() === "" || !Number.isFinite(rd) || rd < floor || rd > 350;
  const save = useMutation({
    mutationFn: (next: number) => adminApi.setPlayerRd(pw, player.steam_id, next),
    onSuccess: async () => {
      await Promise.all(["admin", "players", "leaderboard", "player", "ranks"].map((key) => qc.invalidateQueries({ queryKey: [key] })));
      setDraft(null);
    },
  });
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (!invalid && !server.isPending && !server.error && !save.isPending && rd !== stored) save.mutate(rd); }}>
      <label className="flex min-w-0 flex-col gap-1">
        <Caption>Stored RD: {stored} · effective RD: {player.rd}</Caption>
        <Input aria-label="Player RD" type="number" min={floor} max={350} step="any" inputMode="decimal" value={value} disabled={save.isPending} onChange={(e) => { save.reset(); setDraft(e.target.value); }} />
      </label>
      <Button type="submit" variant="secondary" disabled={server.isPending || !!server.error || invalid || rd === stored || save.isPending}>{save.isPending ? "Saving…" : "Save RD"}</Button>
      <Caption className="w-full">Allowed RD: {floor}–350. Games and wins stay the same.</Caption>
      {invalid && <Text variant="caption" tone="danger" role="alert">Enter RD from {floor} to 350.</Text>}
      {(save.error || server.error) && <Text variant="caption" tone="danger" role="alert">{(save.error ?? server.error)?.message}</Text>}
    </form>
  );
}
