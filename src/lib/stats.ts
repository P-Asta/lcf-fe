import type { Match, MatchSide } from "./api";

export type Outcome = "win" | "loss" | "draw";

export type PlayerMatch = {
  match: Match;
  me: MatchSide;
  opp: MatchSide;
  outcome: Outcome;
  trDelta: number | null;
};

export const sideOf = (m: Match, steamId: string) => (m.p1.steam_id === steamId ? 1 : 2);

export function perspective(m: Match, steamId: string): PlayerMatch {
  const mine = sideOf(m, steamId);
  const me = mine === 1 ? m.p1 : m.p2;
  const opp = mine === 1 ? m.p2 : m.p1;
  const outcome: Outcome = m.winner === 0 ? "draw" : m.winner === mine ? "win" : "loss";
  const trDelta = me.tr_before != null && me.tr_after != null ? me.tr_after - me.tr_before : null;
  return { match: m, me, opp, outcome, trDelta };
}

export type Tally = { games: number; wins: number };

export type MoonStat = Tally & { moon: string; best: number };

export type Record = { value: number; pm: PlayerMatch } | null;

export type PlayerStats = {
  history: PlayerMatch[];
  games: number;
  wins: number;
  losses: number;
  draws: number;
  moons: MoonStat[];
  events: (Tally & { kind: string })[];
  bestScore: Record;
  biggestWin: Record;
  longestStreak: number;
  currentStreak: number;
  deathlessWins: number;
  distinctMoons: number;
  eventWins: number;
  totalValue: number;
};

const bump = <K>(map: Map<K, Tally>, key: K, win: boolean) => {
  const t = map.get(key) ?? { games: 0, wins: 0 };
  t.games += 1;
  if (win) t.wins += 1;
  map.set(key, t);
};

export function playerStats(matches: Match[], steamId: string): PlayerStats {
  const history = matches.map((m) => perspective(m, steamId));
  const moons = new Map<string, MoonStat>();
  const events = new Map<string, Tally>();
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let bestScore: Record = null;
  let biggestWin: Record = null;
  let deathlessWins = 0;
  let eventWins = 0;
  let totalValue = 0;

  for (const pm of history) {
    const win = pm.outcome === "win";
    if (win) wins += 1;
    else if (pm.outcome === "loss") losses += 1;
    else draws += 1;
    totalValue += pm.me.score;

    const ms = moons.get(pm.match.moon) ?? { moon: pm.match.moon, games: 0, wins: 0, best: 0 };
    ms.games += 1;
    if (win) ms.wins += 1;
    ms.best = Math.max(ms.best, pm.me.score);
    moons.set(pm.match.moon, ms);

    if (pm.match.events.length === 0) bump(events, "none", win);
    for (const e of pm.match.events) bump(events, e.kind, win);
    if (win && pm.match.events.length > 0) eventWins += 1;

    if (!bestScore || pm.me.score > bestScore.value) bestScore = { value: pm.me.score, pm };
    if (win && pm.match.reason === "score") {
      const margin = pm.me.score - pm.opp.score;
      if (!biggestWin || margin > biggestWin.value) biggestWin = { value: margin, pm };
    }
    if (win && pm.me.deaths === 0 && pm.match.reason === "score") deathlessWins += 1;
  }

  let longestStreak = 0;
  let run = 0;
  for (const pm of [...history].reverse()) {
    run = pm.outcome === "win" ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }
  let currentStreak = 0;
  for (const pm of history) {
    if (pm.outcome !== "win") break;
    currentStreak += 1;
  }

  return {
    history,
    games: history.length,
    wins,
    losses,
    draws,
    moons: [...moons.values()].sort((a, b) => b.games - a.games || a.moon.localeCompare(b.moon)),
    events: [...events.entries()].map(([kind, t]) => ({ kind, ...t })).sort((a, b) => b.games - a.games),
    bestScore,
    biggestWin,
    longestStreak,
    currentStreak,
    deathlessWins,
    distinctMoons: moons.size,
    eventWins,
    totalValue,
  };
}
