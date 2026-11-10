import type { ReactNode } from "react";
import { NavLink } from "react-router";
import stardust from "../../../assets/stardust.png";
import { Container } from "@/components/layout/Container";
import { RankedStatus } from "@/components/RankedStatus";
import { LAYER } from "@/lib/layers";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Leaderboard", end: true },
  { to: "/moons", label: "Moons", end: false },
  { to: "/players", label: "Players", end: false },
];

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-bg">
      <div
        aria-hidden
        className={cn(LAYER.base, "pointer-events-none absolute inset-x-0 top-0 h-[56rem] bg-muted bg-cover bg-top bg-no-repeat bg-blend-multiply opacity-40")}
        style={{ backgroundImage: `url(${stardust})` }}
      />
      <header className={cn(LAYER.header, "relative bg-bg")}>
        <Container className="flex h-14 items-center gap-8">
          <NavLink to="/" className="cursor-pointer text-title font-extrabold tracking-tight text-fg">
            LCF
          </NavLink>
          <nav aria-label="Main" className="flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn("flex h-9 cursor-pointer items-center rounded-control px-3 text-body transition-colors", isActive ? "text-fg" : "text-muted hover:text-fg")
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <RankedStatus className="ml-auto hidden sm:flex" />
        </Container>
      </header>
      <main className="relative pt-16 pb-24">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
