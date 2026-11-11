export type GameEvent = { kind: string; detail?: string | null };

export type LeaderboardEntry = {
  position: number;
  steam_id: string;
  name: string;
  avatar: string | null;
  tr: number;
  peak_tr: number;
  glicko: number;
  rd: number;
  rank: string;
  games: number;
  wins: number;
  /** Badges worn next to the name (two slots). */
  worn: (number | null)[];
};

export type LeaderboardResponse = {
  total: number;
  ranked_total: number;
  entries: LeaderboardEntry[];
};

export type Profile = {
  steam_id: string;
  name: string;
  tr: number;
  glicko: number;
  rd: number;
  rank: string;
  games: number;
  wins: number;
  position: number | null;
  /** Badges worn next to the name (two slots). */
  worn: (number | null)[];
};

export type RankIcon = {
  id: string;
  name: string;
  top: number;
  /** SVG or PNG, server path. */
  icon: string;
  /** Square PNG (what the mod shows), server path. */
  png: string;
  custom: boolean;
};

export type MatchSide = {
  steam_id: string;
  name: string | null;
  avatar: string | null;
  score: number;
  deaths: number;
  tr_before: number | null;
  tr_after: number | null;
};

export type MatchKind = "ranked" | "quick" | "public" | "private";

export type DailySettings = {
  seed: number;
  moon: string;
  banned: string[];
  weather: string;
  event: GameEvent | null;
  events: GameEvent[];
};

export type DailyRow = { place: number; steam_id: string; name: string; avatar: string | null; score: number };

export type DailyResponse = {
  day: string;
  settings: DailySettings;
  /** Seconds until the next challenge (00:00 UTC). */
  ends_in: number;
  /** 00:00 - 00:01 UTC: closed. */
  locked: boolean;
  first: DailyRow[];
  best: DailyRow[];
  /** The current challenge's day, and whether this one is it (still running). */
  today: string;
  live: boolean;
  /** Every stored challenge, newest first. */
  days: { day: string; players: number }[];
};

export type DailyAdminResponse = DailyResponse & { moons: string[]; tools: string[]; event_kinds: string[] };

export type Match = {
  id: string;
  kind: MatchKind;
  created: number;
  moon: string;
  weather: string;
  events: GameEvent[];
  p1: MatchSide;
  p2: MatchSide;
  winner: 0 | 1 | 2;
  reason: string;
  rated: boolean;
};

export type PlayerResponse = {
  profile: Profile;
  avatar: string | null;
  joined: number;
  peak_tr: number | null;
  ranked_total: number;
  matches: Match[];
  badges: PlayerBadge[];
  /** Past daily challenges won: on the first-play board and on the best board. */
  daily_wins: { first: number; best: number };
  /** How this player died (all match kinds), most frequent first. `cause` null = unknown. */
  death_causes: { cause: string | null; count: number }[];
};

export type MoonLeader = {
  steam_id: string;
  name: string | null;
  avatar: string | null;
  /** Highest ship value in a single match on this moon. */
  best: number;
  best_at: number;
  /** Sum of ship values over every match on this moon. */
  total: number;
  games: number;
};

export type MoonBoard = { moon: string; matches: number; leaders: MoonLeader[] };

export type MoonsResponse = { moons: MoonBoard[] };

export type StatsResponse = {
  online: number;
  ranked: { searching: number; playing: number };
};

export type PlayerListEntry = {
  steam_id: string;
  name: string;
  avatar: string | null;
  tr: number;
  rank: string;
  /** Ladder position, null until the first rated game. */
  position: number | null;
  games: number;
  wins: number;
  /** Ids of the badges this player holds. */
  badges: number[];
  /** The badge the player wears next to their name. */
  /** Badges worn next to the name (two slots). */
  worn: (number | null)[];
};

export type PlayerListResponse = { total: number; ranked_total: number; entries: PlayerListEntry[] };

export type AdminPlayer = PlayerListEntry & {
  glicko: number;
  rd: number;
  created: number;
  last_login: number;
  last_played: number;
  last_ip: string;
  online: boolean;
  banned: boolean;
  /** 0 = not banned, -1 = permanent, otherwise unix seconds. */
  banned_until: number;
  ban_reason: string;
};

export type AdminPlayersResponse = { total: number; ranked_total: number; entries: AdminPlayer[] };

export type AuditEntry = {
  id: number;
  created: number;
  steam_id: string;
  match_id: string;
  kind: string;
  detail: string;
  name: string | null;
};

export type BadgeDef = {
  id: number;
  name: string;
  description: string;
  /** Server path (prefix with the API base via `assetUrl`), null until an image is uploaded. */
  image: string | null;
  holders: number;
  created: number;
};

export type PlayerBadge = BadgeDef & { granted: number };

export type FamilyEntry = {
  steam_id: string;
  owner_steam_id: string;
  /** The game owner's LCF name, when the owner plays LCF too. */
  owner_name: string | null;
  name: string;
  avatar: string | null;
  last_ip: string;
  attempts: number;
  first_seen: number;
  last_seen: number;
  verified: boolean;
  verified_at: number;
};

export type FamilyResponse = { allow_all: boolean; entries: FamilyEntry[] };

/** Random-roll odds: `no_event` is a share (0..1), the rest are relative weights. */
export type Odds = {
  no_event: number;
  events: Record<string, number>;
  weather: Record<string, number>;
  infestation: Record<string, number>;
};

export type EventConfig = {
  /** Never rolled in ranked / random rolls; rooms can still pick them by hand. */
  hidden: string[];
  /** "roll_all" | "roll" | "none" | an event kind. */
  quick_event: string;
  quick_detail: string | null;
  odds: Odds;
};

export type ServerResponse = {
  events: EventConfig;
  event_kinds: string[];
  /** Seconds until the scheduled shutdown. */
  shutdown_in: number | null;
  stats: { online: number; rooms: number; matches: number; ranked: { searching: number; playing: number }; quick: { searching: number } };
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

/** Absolute URL for a path the API returned (e.g. a badge image). */
export const assetUrl = (path: string) => `${BASE}${path}`;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || res.statusText);
  return res.json() as Promise<T>;
}

async function adminFetch<T>(password: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${password}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || res.statusText);
  return res.json() as Promise<T>;
}

export const adminApi = {
  players: (pw: string) => adminFetch<AdminPlayersResponse>(pw, "/api/admin/players"),
  audit: (pw: string, steamId?: string) =>
    adminFetch<{ entries: AuditEntry[] }>(pw, `/api/admin/audit?limit=200${steamId ? `&steam_id=${encodeURIComponent(steamId)}` : ""}`),
  /** `days` 0 = permanent. */
  ban: (pw: string, steamId: string, days: number, reason: string) => adminFetch<{ ok: true }>(pw, "/api/admin/ban", { steam_id: steamId, days, reason }),
  unban: (pw: string, steamId: string) => adminFetch<{ ok: true }>(pw, "/api/admin/unban", { steam_id: steamId }),
  daily: (pw: string) => adminFetch<DailyAdminResponse>(pw, "/api/admin/daily"),
  /** Replaces today's challenge: today's runs are deleted and everyone sees the reveal again. */
  setDaily: (pw: string, s: DailySettings) => adminFetch<DailyAdminResponse>(pw, "/api/admin/daily", s),
  rerollDaily: (pw: string) => adminFetch<DailyAdminResponse>(pw, "/api/admin/daily/reroll", {}),
  server: (pw: string) => adminFetch<ServerResponse>(pw, "/api/admin/server"),
  setEvents: (pw: string, c: EventConfig) => adminFetch<ServerResponse>(pw, "/api/admin/events", c),
  /** `minutes` until the shutdown; `cancel` calls a scheduled one off. */
  shutdown: (pw: string, body: { minutes?: number; cancel?: boolean }) => adminFetch<ServerResponse>(pw, "/api/admin/shutdown", body),
  family: (pw: string) => adminFetch<FamilyResponse>(pw, "/api/admin/family"),
  setFamilyVerified: (pw: string, steamId: string, verified: boolean) =>
    adminFetch<{ ok: true }>(pw, "/api/admin/family/verify", { steam_id: steamId, verified }),
  deleteFamily: (pw: string, steamId: string) => adminFetch<{ ok: true }>(pw, "/api/admin/family/delete", { steam_id: steamId }),
  createBadge: (pw: string, name: string, description: string) => adminFetch<BadgeDef>(pw, "/api/admin/badges", { name, description }),
  updateBadge: (pw: string, id: number, name: string, description: string) => adminFetch<BadgeDef>(pw, `/api/admin/badges/${id}`, { name, description }),
  /** Raw file upload: PNG, JPEG, GIF or WebP up to 512 KB. */
  uploadBadgeImage: async (pw: string, id: number, file: Blob) => {
    const res = await fetch(`${BASE}/api/admin/badges/${id}/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${pw}`, "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) throw new ApiError(res.status, (await res.text()) || res.statusText);
    return res.json() as Promise<BadgeDef>;
  },
  /** SVG or PNG up to 512 KB; replaces the rank's icon on the site and in the mod. */
  uploadRankIcon: async (pw: string, id: string, file: Blob) => {
    const res = await fetch(`${BASE}/api/admin/ranks/${id}/icon`, {
      method: "POST",
      headers: { Authorization: `Bearer ${pw}`, "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) throw new ApiError(res.status, (await res.text()) || res.statusText);
    return res.json() as Promise<{ ranks: RankIcon[] }>;
  },
  resetRankIcon: (pw: string, id: string) => adminFetch<{ ranks: RankIcon[] }>(pw, `/api/admin/ranks/${id}/reset`, {}),
  deleteBadge: (pw: string, id: number) => adminFetch<{ ok: true }>(pw, `/api/admin/badges/${id}/delete`, {}),
  grantBadge: (pw: string, id: number, steamId: string) => adminFetch<{ ok: true }>(pw, `/api/admin/badges/${id}/grant`, { steam_id: steamId }),
  revokeBadge: (pw: string, id: number, steamId: string) => adminFetch<{ ok: true }>(pw, `/api/admin/badges/${id}/revoke`, { steam_id: steamId }),
};

export const api = {
  leaderboard: () => get<LeaderboardResponse>("/api/leaderboard?limit=1000"),
  players: () => get<PlayerListResponse>("/api/players"),
  badges: () => get<{ badges: BadgeDef[] }>("/api/badges"),
  ranks: () => get<{ ranks: RankIcon[] }>("/api/ranks"),
  daily: (day?: string) => get<DailyResponse>(day ? `/api/daily?day=${encodeURIComponent(day)}` : "/api/daily"),
  player: (steamId: string) => get<PlayerResponse>(`/api/player/${encodeURIComponent(steamId)}`),
  moons: () => get<MoonsResponse>("/api/moons"),
  stats: () => get<StatsResponse>("/api/stats"),
};
