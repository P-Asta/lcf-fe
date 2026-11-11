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
  badge: number | null;
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
  badge: number | null;
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

export type MatchKind = "ranked" | "public" | "private";

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
  badge: number | null;
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
  player: (steamId: string) => get<PlayerResponse>(`/api/player/${encodeURIComponent(steamId)}`),
  moons: () => get<MoonsResponse>("/api/moons"),
  stats: () => get<StatsResponse>("/api/stats"),
};
