export const RANK_COLORS: Record<string, string> = {
  "x+": "#ff45ff",
  x: "#ff8fff",
  u: "#ff3813",
  ss: "#db8b1f",
  "s+": "#d8af0e",
  s: "#e0a71b",
  "s-": "#b2972b",
  "a+": "#1fa834",
  a: "#46ad51",
  "a-": "#3bb687",
  "b+": "#4f99c0",
  b: "#4f64c9",
  "b-": "#5650c7",
  "c+": "#552883",
  c: "#733e8f",
  "c-": "#79558c",
  "d+": "#8e6091",
  d: "#907591",
};

export const hasRank = (rank?: string | null) => !!rank && rank !== "z";

export const rankLabel = (rank?: string | null) => (hasRank(rank) ? rank!.toUpperCase() : "?");
