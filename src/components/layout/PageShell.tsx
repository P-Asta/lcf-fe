import type { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { Container } from "@/components/layout/Container";
import ClickSpark from "@/components/reactbits/ClickSpark";
import DotGrid from "@/components/reactbits/DotGrid";
import GooeyNav from "@/components/reactbits/GooeyNav";
import { RankedStatus } from "@/components/RankedStatus";
import { useVisit } from "@/hooks/useVisit";
import { LAYER } from "@/lib/layers";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/league", label: "League" },
  { to: "/daily", label: "Daily race" },
  { to: "/moons", label: "Moons" },
  { to: "/players", label: "Players" },
];

const navIndex = (path: string) => {
  const i = NAV.findIndex((n) => n.to !== "/" && (path === n.to || path.startsWith(`${n.to}/`)));
  return i < 0 ? 0 : i;
};

export function PageShell({ children }: { children: ReactNode }) {
  useVisit();
  const path = useLocation().pathname;
  const navigate = useNavigate();
  const landing = path === "/";
  return (
    <ClickSpark sparkColor={["#ff4d3d", "#ff8b80"]} sparkCount={10} sparkRadius={22} sparkSize={8} duration={420} className="block">
      <div className="relative min-h-dvh bg-bg">
        {!landing && (
          <div aria-hidden className={cn(LAYER.base, "pointer-events-none absolute inset-x-0 top-0 h-[40rem]")}>
            <DotGrid dotSize={3} gap={22} baseColor="#2b1517" activeColor="#ff4d3d" proximity={140} fade={0.7} glow={0.4} />
          </div>
        )}
        <header className={cn(LAYER.header, "relative bg-bg")}>
          <Container className="flex h-14 items-center gap-6">
            <NavLink to="/" className="flex cursor-pointer items-center gap-2 text-title font-extrabold tracking-tight text-fg">
              <img src="/favicon.png" alt="" className="size-7 rounded-control [image-rendering:pixelated]" />
              LCF
            </NavLink>
            <GooeyNav
              size="sm"
              theme="dark"
              color="#c8150a"
              activeTextColor="#ffffff"
              activeIndex={navIndex(path)}
              items={NAV.map((n) => ({ label: n.label }))}
              onChange={(i) => navigate(NAV[i].to)}
              className="hidden md:inline-flex"
            />
            <nav aria-label="Main" className="flex items-center gap-1 md:hidden">
              {NAV.slice(1).map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    cn("flex h-9 cursor-pointer items-center rounded-control px-2 text-body transition-colors", isActive ? "text-fg" : "text-muted hover:text-fg")
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
            <RankedStatus className="ml-auto hidden lg:flex" />
          </Container>
        </header>
        {landing ? (
          <main className="relative pb-24">{children}</main>
        ) : (
          <main className="relative pt-16 pb-24">
            <Container>{children}</Container>
          </main>
        )}
      </div>
    </ClickSpark>
  );
}
