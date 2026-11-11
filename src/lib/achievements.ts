import {
  Award,
  CircleDollarSign,
  CloudLightning,
  Crown,
  Flag,
  Flame,
  Gem,
  MapIcon,
  Medal,
  Package,
  Shield,
  Swords,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Profile } from "./api";
import type { PlayerStats } from "./stats";

export type Achievement = { id: string; name: string; description: string; icon: LucideIcon; unlocked: boolean };

const ELITE = new Set(["zed", "boss1", "boss2", "boss3", "ldr1", "ldr2", "ldr3"]);

const wonWith = (s: PlayerStats, kind: string) => s.history.some((pm) => pm.outcome === "win" && pm.match.events.some((e) => e.kind === kind));

export function achievements(s: PlayerStats, profile: Profile, peakTr: number | null): Achievement[] {
  const best = s.bestScore?.value ?? 0;
  return [
    { id: "first-win", name: "First Win", description: "Win a match.", icon: Flag, unlocked: s.wins >= 1 },
    { id: "ten-wins", name: "Ten Wins", description: "Win 10 matches.", icon: Medal, unlocked: s.wins >= 10 },
    { id: "placed", name: "Hired", description: "Play your first ranked match.", icon: Award, unlocked: profile.games >= 1 },
    { id: "big-haul", name: "Big Haul", description: "Leave a moon with $1,000 of scrap.", icon: CircleDollarSign, unlocked: best >= 1000 },
    { id: "jackpot", name: "Jackpot", description: "Leave a moon with $2,500 of scrap.", icon: Gem, unlocked: best >= 2500 },
    { id: "untouched", name: "Untouched", description: "Win on ship value without dying.", icon: Shield, unlocked: s.deathlessWins >= 1 },
    { id: "hot-streak", name: "Hot Streak", description: "Win 5 matches in a row.", icon: Flame, unlocked: s.longestStreak >= 5 },
    { id: "explorer", name: "Explorer", description: "Play on 6 different moons.", icon: MapIcon, unlocked: s.distinctMoons >= 6 },
    { id: "chaos", name: "Chaos Tamer", description: "Win 5 matches that had an event.", icon: Zap, unlocked: s.eventWins >= 5 },
    { id: "single-minded", name: "Single Minded", description: "Win on a single item day.", icon: Package, unlocked: wonWith(s, "sid") },
    { id: "meteor", name: "Starfall", description: "Win during a meteor shower.", icon: CloudLightning, unlocked: wonWith(s, "meteor_shower") },
    { id: "veteran", name: "Veteran", description: "Play 50 matches.", icon: Swords, unlocked: s.games >= 50 },
    { id: "contender", name: "Contender", description: "Reach 15,000 TR.", icon: TrendingUp, unlocked: (peakTr ?? 0) >= 15000 || profile.tr >= 15000 },
    { id: "elite", name: "Elite", description: "Reach Leader III or higher.", icon: Crown, unlocked: ELITE.has(profile.rank) },
  ];
}
