import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const errorRetry = (q: { state: { status: string } }) => (q.state.status === "error" ? 10_000 : false);

export const useLeaderboard = () =>
  useQuery({ queryKey: ["leaderboard"], queryFn: api.leaderboard, refetchInterval: (q) => errorRetry(q) || 60_000 });

export const usePlayer = (steamId: string) =>
  useQuery({ queryKey: ["player", steamId], queryFn: () => api.player(steamId), refetchInterval: errorRetry, enabled: !!steamId });

export const useMatches = (month?: string) =>
  useQuery({ queryKey: ["matches", month ?? "latest"], queryFn: () => api.matches(month), placeholderData: keepPreviousData, refetchInterval: errorRetry });
