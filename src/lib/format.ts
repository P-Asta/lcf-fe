import type { GameEvent, MatchKind } from "./api";

const number = new Intl.NumberFormat("en-US");
const decimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const fmtInt = (n: number) => number.format(Math.round(n));
export const fmtTr = (n: number) => decimal.format(n);
export const fmtMoney = (n: number) => `$${number.format(Math.round(n))}`;
export const fmtPct = (part: number, whole: number) => (whole <= 0 ? "-" : `${Math.round((part / whole) * 100)}%`);
export const fmtSigned = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${decimal.format(Math.abs(n))}`;

export const fmtDate = (unix: number) =>
  new Date(unix * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const fmtDay = (unix: number) =>
  new Date(unix * 1000).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

export const fmtTime = (unix: number) =>
  new Date(unix * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

export const fmtMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
};

export const dayKey = (unix: number) => {
  const d = new Date(unix * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const EVENT_LABELS: Record<string, string> = {
  weather: "Weather",
  indoor_fog: "Indoor fog",
  infestation: "Infestation",
  hardcore: "Hardcore",
  allow_twohanded: "Two-handed",
  no_weight: "No weight",
  sid: "Single item day",
  meteor_shower: "Meteor shower",
  none: "No event",
};

const DETAIL_LABELS: Record<string, string> = {
  hoarding_bug: "Hoarding bug",
  nutcracker: "Nutcracker",
};

export const eventKindLabel = (kind: string) => EVENT_LABELS[kind] ?? kind;

export const eventLabel = (e: GameEvent) => {
  const base = eventKindLabel(e.kind);
  if (!e.detail) return base;
  const d = DETAIL_LABELS[e.detail] ?? e.detail.charAt(0).toUpperCase() + e.detail.slice(1);
  return `${base}: ${d}`;
};

export const kindLabel = (k: MatchKind) => (k === "ranked" ? "Ranked" : k === "quick" ? "Quick play" : k === "public" ? "Public" : "Private");

export const reasonLabel = (reason: string) => {
  switch (reason) {
    case "score":
      return "Ship value";
    case "eliminated":
      return "3 deaths";
    case "forfeit":
      return "Forfeit";
    case "disconnected":
      return "Disconnect";
    case "failed to load":
      return "Failed to load";
    case "integrity":
      return "Mod check";
    case "cheating":
      return "Rule violation";
    case "timeout":
      return "Time limit";
    case "banned":
      return "Banned";
    default:
      return reason;
  }
};

const DEATH_LABELS: Record<string, string> = {
  Bludgeoning: "Bludgeoned",
  Gravity: "Fell to death",
  Blast: "Blown up",
  Strangulation: "Strangled",
  Suffocation: "Suffocated",
  Mauling: "Mauled",
  Gunshots: "Shot",
  Crushing: "Crushed",
  Drowning: "Drowned",
  Abandoned: "Left behind",
  Electrocution: "Electrocuted",
  Kicking: "Kicked",
  Burning: "Burned",
  Stabbing: "Stabbed",
  Fan: "Shredded by a fan",
  Inertia: "Crashed",
  Snipping: "Snipped",
  Scratching: "Scratched",
};

/** Lethal Company CauseOfDeath name -> readable label. */
export const deathLabel = (cause: string | null) => (cause ? (DEATH_LABELS[cause] ?? cause) : "Unknown");

export const shortMoon = (moon: string) => moon.slice(0, 3);
