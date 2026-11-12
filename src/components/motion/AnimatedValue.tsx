import type { ReactNode } from "react";
import CountUp from "@/components/reactbits/CountUp";

const NUMBER = /^([^\d-]*?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/s;

export function AnimatedValue({ value }: { value: ReactNode }) {
  if (typeof value !== "number" && typeof value !== "string") return <>{value}</>;
  const m = NUMBER.exec(String(value));
  if (!m) return <>{value}</>;
  const [, prefix, raw, suffix] = m;
  const to = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(to)) return <>{value}</>;
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  return (
    <>
      <span className="sr-only">{value}</span>
      <span aria-hidden>
        <CountUp to={to} prefix={prefix} suffix={suffix} separator={raw.includes(",") || Math.abs(to) >= 1000 ? "," : ""} decimals={decimals} duration={1.2} />
      </span>
    </>
  );
}
