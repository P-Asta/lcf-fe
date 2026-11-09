import { memo } from "react";
import { shortMoon } from "@/lib/format";
import type { MoonStat } from "@/lib/stats";

const SIZE = 280;
const C = SIZE / 2;
const R = 96;
const RINGS = [0.2, 0.4, 0.6, 0.8, 1];

const point = (i: number, n: number, r: number) => {
  const a = (Math.PI * 2 * i) / n - Math.PI / 2;
  return [C + Math.cos(a) * r, C + Math.sin(a) * r] as const;
};

const polygon = (n: number, r: (i: number) => number) =>
  Array.from({ length: n }, (_, i) => point(i, n, r(i)).join(",")).join(" ");

function MoonRadarImpl({ moons }: { moons: MoonStat[] }) {
  const axes = moons.slice(0, 8);
  const n = Math.max(axes.length, 3);
  const rate = (i: number) => {
    const m = axes[i];
    return m && m.games > 0 ? m.wins / m.games : 0;
  };
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Win rate by moon" className="mx-auto w-full max-w-72">
      {RINGS.map((k) => (
        <polygon key={k} points={polygon(n, () => R * k)} fill="none" className="stroke-line" strokeWidth={1} />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = point(i, n, R);
        return <line key={i} x1={C} y1={C} x2={x} y2={y} className="stroke-line" strokeWidth={1} />;
      })}
      {axes.length > 0 && (
        <polygon points={polygon(n, (i) => R * Math.max(rate(i), 0.03))} className="fill-primary-800 stroke-primary-300" strokeWidth={2} strokeLinejoin="round" />
      )}
      {axes.map((m, i) => {
        const [x, y] = point(i, n, R * Math.max(rate(i), 0.03));
        return <circle key={m.moon} cx={x} cy={y} r={3} className="fill-primary-300" />;
      })}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = point(i, n, R + 24);
        const m = axes[i];
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-muted text-caption">
            {m ? shortMoon(m.moon) : ""}
          </text>
        );
      })}
    </svg>
  );
}

export const MoonRadar = memo(MoonRadarImpl);
