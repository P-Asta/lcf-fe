import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, ImageUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Avatar } from "@/components/Avatar";
import { BadgeImage } from "@/components/BadgeIcon";
import { PrefixFields, PrefixPreview } from "@/components/NamePrefix";
import { EmptyState, ErrorState } from "@/components/StateBlock";
import { Stack } from "@/components/layout/Stack";
import { Panel } from "@/components/layout/Section";
import { Caption, Text } from "@/components/typography/Text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi, api, type AdminPlayer, type BadgeDef, type BadgeStyle } from "@/lib/api";

const MAX_BYTES = 512 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Checks a picked file before upload; returns an error message or null. */
export const checkImage = (f: File) =>
  !TYPES.includes(f.type) ? "Use a PNG, JPEG, GIF or WebP image." : f.size > MAX_BYTES ? "The image must be 512 KB or smaller." : null;

/** Invalidate everything that shows badges. */
export function useBadgeRefresh() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["badges"] });
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["players"] });
    qc.invalidateQueries({ queryKey: ["player"] });
  };
}

/** Object URL preview for a picked file, revoked when it changes. */
function usePreview(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

function ImagePicker({ file, onFile, current, label }: { file: File | null; onFile: (f: File | null, err: string | null) => void; current?: BadgeDef; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const preview = usePreview(file);
  return (
    <Stack direction="row" align="center" gap={3}>
      {preview ? (
        <span className="inline-flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-3">
          <img src={preview} alt="" className="size-full object-contain" />
        </span>
      ) : current ? (
        <BadgeImage badge={current} size="lg" />
      ) : (
        <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-control bg-surface-3 text-muted">
          <Award aria-hidden className="size-8" />
        </span>
      )}
      <input
        ref={ref}
        type="file"
        accept={TYPES.join(",")}
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = "";
          if (!f) return;
          const err = checkImage(f);
          onFile(err ? null : f, err);
        }}
      />
      <Stack gap={1}>
        <Button type="button" variant="secondary" size="sm" onClick={() => ref.current?.click()}>
          <ImageUp aria-hidden />
          {file ? "Change image" : current?.image ? "Replace image" : "Choose image"}
        </Button>
        <Caption>{file ? file.name : "PNG, JPEG, GIF or WebP · up to 512 KB · square works best"}</Caption>
      </Stack>
    </Stack>
  );
}

const styleOf = (b?: BadgeDef): BadgeStyle => ({ prefix: b?.prefix ?? "", color1: b?.color1 ?? "", color2: b?.color2 ?? "" });

function CreateBadge({ pw }: { pw: string }) {
  const refresh = useBadgeRefresh();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState<BadgeStyle>(styleOf());
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const b = await adminApi.createBadge(pw, name.trim(), description.trim(), style);
      if (file) await adminApi.uploadBadgeImage(pw, b.id, file);
      return b;
    },
    onSuccess: () => {
      setName("");
      setDescription("");
      setStyle(styleOf());
      setFile(null);
      refresh();
    },
    onSettled: refresh,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) create.mutate();
  };

  return (
    <Panel className="p-4">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Text variant="title" as="h2">
          New badge
        </Text>
        <ImagePicker
          file={file}
          label="Badge image"
          onFile={(f, err) => {
            setFile(f);
            setFileErr(err);
          }}
        />
        {fileErr && (
          <Text variant="caption" tone="danger" role="alert">
            {fileErr}
          </Text>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <label className="flex flex-col gap-1">
            <Caption>Name</Caption>
            <Input value={name} maxLength={40} required onChange={(e) => setName(e.target.value)} placeholder="Beta tester" />
          </label>
          <label className="flex flex-col gap-1">
            <Caption>Description</Caption>
            <Input value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} placeholder="Shown when hovering the badge" />
          </label>
        </div>
        <PrefixFields defaultText={name} style={style} onChange={setStyle} />
        {create.error && (
          <Text variant="caption" tone="danger" role="alert">
            {errText(create.error)}
          </Text>
        )}
        <Button type="submit" variant="primary" className="w-fit" disabled={create.isPending || !name.trim()}>
          <Plus aria-hidden />
          {create.isPending ? "Creating…" : "Create badge"}
        </Button>
      </form>
    </Panel>
  );
}

function BadgeCard({ pw, badge, players }: { pw: string; badge: BadgeDef; players: AdminPlayer[] }) {
  const refresh = useBadgeRefresh();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(badge.name);
  const [description, setDescription] = useState(badge.description);
  const [style, setStyle] = useState<BadgeStyle>(styleOf(badge));
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [who, setWho] = useState("");

  const holders = useMemo(() => players.filter((p) => p.badges.includes(badge.id)), [players, badge.id]);
  const matches = useMemo(() => {
    const q = who.trim().toLowerCase();
    if (!q) return [];
    return players.filter((p) => !p.badges.includes(badge.id) && (p.name.toLowerCase().includes(q) || p.steam_id.includes(q))).slice(0, 6);
  }, [players, who, badge.id]);

  const save = useMutation({
    mutationFn: async () => {
      await adminApi.updateBadge(pw, badge.id, name.trim(), description.trim(), style);
      if (file) await adminApi.uploadBadgeImage(pw, badge.id, file);
    },
    onSuccess: () => {
      setEditing(false);
      setFile(null);
    },
    onSettled: refresh,
  });
  const remove = useMutation({ mutationFn: () => adminApi.deleteBadge(pw, badge.id), onSettled: refresh });
  const grant = useMutation({
    mutationFn: (steamId: string) => adminApi.grantBadge(pw, badge.id, steamId),
    onSuccess: () => setWho(""),
    onSettled: refresh,
  });
  const revoke = useMutation({ mutationFn: (steamId: string) => adminApi.revokeBadge(pw, badge.id, steamId), onSettled: refresh });
  const err = save.error ?? remove.error ?? grant.error ?? revoke.error;

  return (
    <Panel className="flex flex-col gap-4 p-4">
      {editing ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) save.mutate();
          }}
        >
          <ImagePicker
            file={file}
            current={badge}
            label={`Image for ${badge.name}`}
            onFile={(f, er) => {
              setFile(f);
              setFileErr(er);
            }}
          />
          {fileErr && (
            <Text variant="caption" tone="danger" role="alert">
              {fileErr}
            </Text>
          )}
          <label className="flex flex-col gap-1">
            <Caption>Name</Caption>
            <Input value={name} maxLength={40} required onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <Caption>Description</Caption>
            <Input value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <PrefixFields defaultText={name} style={style} onChange={setStyle} />
          <Stack direction="row" gap={2}>
            <Button type="submit" variant="primary" size="sm" disabled={save.isPending || !name.trim()}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setName(badge.name);
                setDescription(badge.description);
                setStyle(styleOf(badge));
                setFile(null);
                setFileErr(null);
              }}
            >
              Cancel
            </Button>
          </Stack>
        </form>
      ) : (
        <Stack direction="row" align="start" gap={3}>
          <BadgeImage badge={badge} size="lg" />
          <Stack gap={1} className="min-w-0 flex-1">
            <Text variant="title" className="truncate">
              {badge.name}
            </Text>
            <Caption className="break-words">{badge.description || "No description"}</Caption>
            <Caption>
              Prefix: <PrefixPreview text={badge.prefix?.trim() || badge.name} colors={[badge.color1, badge.color2].filter(Boolean)} />
            </Caption>
            <Caption>
              {holders.length} {holders.length === 1 ? "holder" : "holders"}
            </Caption>
          </Stack>
          <Stack direction="row" gap={1}>
            <Button variant="ghost" size="iconSm" aria-label={`Edit ${badge.name}`} onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="iconSm"
              aria-label={`Delete ${badge.name}`}
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm(`Delete "${badge.name}"? It is taken away from ${holders.length} player(s). This cannot be undone.`)) remove.mutate();
              }}
            >
              <Trash2 aria-hidden className="text-danger" />
            </Button>
          </Stack>
        </Stack>
      )}

      <Stack gap={2}>
        <div className="relative">
          <Input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Give to player (name or Steam ID)" aria-label={`Give ${badge.name} to a player`} />
          {matches.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 flex flex-col overflow-hidden rounded-card bg-surface-3 shadow-float">
              {matches.map((p) => (
                <li key={p.steam_id}>
                  <button
                    type="button"
                    disabled={grant.isPending}
                    onClick={() => grant.mutate(p.steam_id)}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-body hover:bg-line"
                  >
                    <Avatar src={p.avatar} name={p.name} size="sm" />
                    <span className="truncate">{p.name}</span>
                    <span className="ml-auto text-caption text-muted tabular-nums">{p.steam_id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {holders.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {holders.map((p) => (
              <li key={p.steam_id} className="flex items-center gap-1 rounded-pill bg-surface-2 py-1 pr-1 pl-1">
                <Avatar src={p.avatar} name={p.name} size="sm" />
                <Link to={`/players/${p.steam_id}`} className="max-w-32 truncate text-caption hover:text-primary-200">
                  {p.name}
                </Link>
                <button
                  type="button"
                  aria-label={`Take ${badge.name} from ${p.name}`}
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(p.steam_id)}
                  className="flex size-5 cursor-pointer items-center justify-center rounded-pill text-muted hover:bg-surface-3 hover:text-danger"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </li>
            ))}
          </ul>
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

export function BadgeManager({ pw, players }: { pw: string; players: AdminPlayer[] }) {
  const badges = useQuery({ queryKey: ["badges"], queryFn: api.badges });
  return (
    <Stack gap={6}>
      <CreateBadge pw={pw} />
      {badges.error ? (
        <ErrorState error={badges.error} />
      ) : badges.isPending ? (
        <Skeleton className="h-48 rounded-card" />
      ) : badges.data.badges.length === 0 ? (
        <EmptyState icon={Award} title="No badges yet">
          Create one above, then give it to players here or from their row in the Players tab.
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {badges.data.badges.map((b) => (
            <BadgeCard key={`${b.id}-${b.created}`} pw={pw} badge={b} players={players} />
          ))}
        </div>
      )}
    </Stack>
  );
}

/** Badge chips with grant / revoke for one player (used in the Players tab). */
export function PlayerBadgeEditor({ pw, player }: { pw: string; player: AdminPlayer }) {
  const refresh = useBadgeRefresh();
  const defs = useQuery({ queryKey: ["badges"], queryFn: api.badges }).data?.badges ?? [];
  const [pick, setPick] = useState("");
  const held = defs.filter((d) => player.badges.includes(d.id));
  const available = defs.filter((d) => !player.badges.includes(d.id));
  const grant = useMutation({
    mutationFn: (id: number) => adminApi.grantBadge(pw, id, player.steam_id),
    onSuccess: () => setPick(""),
    onSettled: refresh,
  });
  const revoke = useMutation({ mutationFn: (id: number) => adminApi.revokeBadge(pw, id, player.steam_id), onSettled: refresh });
  const err = grant.error ?? revoke.error;

  return (
    <Stack gap={2}>
      <Caption>Badges</Caption>
      {held.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
          {held.map((b) => (
            <li key={b.id} className="flex items-center gap-1 rounded-pill bg-surface py-1 pr-1 pl-1">
              <BadgeImage badge={b} size="sm" />
              <span className="text-caption">{b.name}</span>
              <button
                type="button"
                aria-label={`Take ${b.name} from ${player.name}`}
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(b.id)}
                className="flex size-5 cursor-pointer items-center justify-center rounded-pill text-muted hover:bg-surface-3 hover:text-danger"
              >
                <X aria-hidden className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Caption>No badges.</Caption>
      )}
      {available.length > 0 && (
        <Select
          value={pick}
          disabled={grant.isPending}
          onValueChange={(v) => {
            setPick(v);
            grant.mutate(Number(v));
          }}
        >
          <SelectTrigger aria-label={`Badge to give ${player.name}`} className="w-56">
            <SelectValue placeholder="Give a badge…" />
          </SelectTrigger>
          <SelectContent>
            {available.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {err && (
        <Text variant="caption" tone="danger" role="alert">
          {errText(err)}
        </Text>
      )}
    </Stack>
  );
}
