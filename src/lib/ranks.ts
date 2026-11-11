/** Lethal Company job-title ranks, best first. Tiers go III (lowest) -> II -> I (highest); top 0.2% is "Zed Dog". */
export const RANKS: { id: string; short: string; name: string; color: string }[] = [
  { id: "zed", short: "ZED", name: "Zed Dog", color: "#ff45ff" },
  { id: "boss1", short: "BOSS I", name: "Boss I", color: "#ff3813" },
  { id: "boss2", short: "BOSS II", name: "Boss II", color: "#f0602a" },
  { id: "boss3", short: "BOSS III", name: "Boss III", color: "#db8b1f" },
  { id: "ldr1", short: "LDR I", name: "Leader I", color: "#d8af0e" },
  { id: "ldr2", short: "LDR II", name: "Leader II", color: "#e0a71b" },
  { id: "ldr3", short: "LDR III", name: "Leader III", color: "#b2972b" },
  { id: "emp1", short: "EMP I", name: "Employee I", color: "#1fa834" },
  { id: "emp2", short: "EMP II", name: "Employee II", color: "#46ad51" },
  { id: "emp3", short: "EMP III", name: "Employee III", color: "#3bb687" },
  { id: "pt1", short: "PT I", name: "Part-Timer I", color: "#4f99c0" },
  { id: "pt2", short: "PT II", name: "Part-Timer II", color: "#4f64c9" },
  { id: "pt3", short: "PT III", name: "Part-Timer III", color: "#5650c7" },
  { id: "int1", short: "INT I", name: "Intern I", color: "#733e8f" },
  { id: "int2", short: "INT II", name: "Intern II", color: "#79558c" },
  { id: "int3", short: "INT III", name: "Intern III", color: "#907591" },
];

const BY_ID = new Map(RANKS.map((r) => [r.id, r]));

export const RANK_COLORS: Record<string, string> = Object.fromEntries(RANKS.map((r) => [r.id, r.color]));

/** 0 = best; unranked/unknown sorts last. */
export const rankIndex = (rank?: string | null) => {
  const i = RANKS.findIndex((r) => r.id === rank);
  return i < 0 ? RANKS.length : i;
};

export const hasRank = (rank?: string | null) => !!rank && BY_ID.has(rank);

/** Short badge text, e.g. "LDR II". */
export const rankLabel = (rank?: string | null) => (rank && BY_ID.get(rank)?.short) || "?";

/** Full title, e.g. "Leader II". */
export const rankName = (rank?: string | null) => (rank && BY_ID.get(rank)?.name) || "Unranked";
