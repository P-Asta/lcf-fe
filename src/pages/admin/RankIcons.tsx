import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageUp, RotateCcw } from "lucide-react";
import { useRef } from "react";
import { ErrorState } from "@/components/StateBlock";
import { Stack } from "@/components/layout/Stack";
import { Panel } from "@/components/layout/Section";
import { Caption, Text } from "@/components/typography/Text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi, api, assetUrl, type RankIcon } from "@/lib/api";

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

function RankCard({ pw, rank }: { pw: string; rank: RankIcon }) {
  const qc = useQueryClient();
  const ref = useRef<HTMLInputElement>(null);
  const done = (data: { ranks: RankIcon[] }) => qc.setQueryData(["ranks"], data);
  const upload = useMutation({ mutationFn: (f: File) => adminApi.uploadRankIcon(pw, rank.id, f), onSuccess: done });
  const reset = useMutation({ mutationFn: () => adminApi.resetRankIcon(pw, rank.id), onSuccess: done });
  const busy = upload.isPending || reset.isPending;
  const err = upload.error ?? reset.error;

  return (
    <Panel className="flex flex-col gap-3 p-4">
      <Stack direction="row" align="center" gap={3}>
        <img src={assetUrl(rank.icon)} alt="" className="aspect-square size-16 shrink-0 object-contain" />
        <img src={assetUrl(`${rank.png}&size=64`)} alt="" className="aspect-square size-8 shrink-0 object-contain" title="In-game (PNG)" />
        <Stack gap={1} className="min-w-0">
          <Text variant="title" className="truncate">
            {rank.name}
          </Text>
          <Caption>Top {rank.top * 100}%</Caption>
        </Stack>
        <Badge tone={rank.custom ? "accent" : "neutral"} className="ml-auto">
          {rank.custom ? "Custom" : "Default"}
        </Badge>
      </Stack>
      <input
        ref={ref}
        type="file"
        accept="image/svg+xml,image/png"
        className="sr-only"
        aria-label={`New icon for ${rank.name}`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          upload.mutate(f);
        }}
      />
      <Stack direction="row" gap={2}>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => ref.current?.click()}>
          <ImageUp aria-hidden />
          {upload.isPending ? "Uploading…" : "Replace"}
        </Button>
        {rank.custom && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => reset.mutate()}>
            <RotateCcw aria-hidden />
            Default
          </Button>
        )}
      </Stack>
      {err && (
        <Text variant="caption" tone="danger" role="alert">
          {errText(err)}
        </Text>
      )}
    </Panel>
  );
}

export function RankIcons({ pw }: { pw: string }) {
  const q = useQuery({ queryKey: ["ranks"], queryFn: api.ranks });
  if (q.error) return <ErrorState error={q.error} />;
  if (q.isPending) return <Skeleton className="h-96 rounded-card" />;
  return (
    <Stack gap={4}>
      <Caption className="text-body">
        Rank icons are served by the server to the website and the mod. Upload an SVG or PNG (square, up to 512 KB); the mod gets a square PNG made from it.
      </Caption>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {q.data.ranks.map((r) => (
          <RankCard key={r.id} pw={pw} rank={r} />
        ))}
      </div>
    </Stack>
  );
}
