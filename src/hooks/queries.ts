import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const errorRetry = (q: { state: { status: string } }) => (q.state.status === "error" ? 10_000 : false);

export const useLeaderboard = () =>
  useQuery({ queryKey: ["leaderboard"], queryFn: api.leaderboard, refetchInterval: (q) => errorRetry(q) || 60_000 });

export const usePlayers = () =>
  useQuery({ queryKey: ["players"], queryFn: api.players, refetchInterval: (q) => errorRetry(q) || 60_000 });

export const usePlayer =(steamId: string) =>
  useQuery({ queryKey: ["player", steamId], queryFn: () => api.player(steamId), refetchInterval: errorRetry, enabled: !!steamId });

export const useMoons = () =>
  useQuery({ queryKey: ["moons"], queryFn: api.moons, refetchInterval: (q) => errorRetry(q) || 60_000 });

export const useLiveStats = () =>
  useQuery({ queryKey: ["stats"], queryFn: api.stats, staleTime: 5_000, refetchInterval: 10_000 });
