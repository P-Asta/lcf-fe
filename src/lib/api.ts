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
  provisional: boolean;
  position: number | null;
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

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || res.statusText);
  return res.json() as Promise<T>;
}

export const api = {
  leaderboard: () => get<LeaderboardResponse>("/api/leaderboard?limit=1000"),
  player: (steamId: string) => get<PlayerResponse>(`/api/player/${encodeURIComponent(steamId)}`),
  moons: () => get<MoonsResponse>("/api/moons"),
  stats: () => get<StatsResponse>("/api/stats"),
};
