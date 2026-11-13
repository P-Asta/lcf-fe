import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { Container } from "@/components/layout/Container";
import ClickSpark from "@/components/reactbits/ClickSpark";
import DotGrid from "@/components/reactbits/DotGrid";
import GooeyNav from "@/components/reactbits/GooeyNav";
import { RankedStatus } from "@/components/RankedStatus";
import { Button } from "@/components/ui/button";
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
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [path]);
  return (
    <ClickSpark sparkColor={["#ff4d3d", "#ff8b80"]} sparkCount={10} sparkRadius={22} sparkSize={8} duration={420} className="block">
      <div className="relative flex min-h-dvh flex-col bg-bg">
        {!landing && (
          <div aria-hidden className={cn(LAYER.base, "pointer-events-none absolute inset-x-0 top-0 h-[40rem]")}>
            <DotGrid dotSize={3} gap={22} baseColor="#2b1517" activeColor="#ff4d3d" proximity={140} fade={0.7} glow={0.4} />
          </div>
        )}
        <header className={cn(LAYER.header, "sticky top-0 border-b border-line/60 bg-bg/85 backdrop-blur-md")}>
          <Container className="flex h-14 items-center gap-4 md:gap-6">
            <NavLink to="/" className="flex cursor-pointer items-center gap-2 text-title font-extrabold tracking-tight text-fg">
              <img src="/favicon.png" alt="" className="size-7 rounded-control [image-rendering:pixelated]" />
              LCF
            </NavLink>
            <div className="hidden md:block">
              <GooeyNav
                size="sm"
                theme="dark"
                color="#c8150a"
                activeTextColor="#ffffff"
                activeIndex={navIndex(path)}
                items={NAV.map((n) => ({ label: n.label }))}
                onChange={(i) => navigate(NAV[i].to)}
              />
            </div>
            <RankedStatus className="ml-auto hidden lg:flex" />
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto md:hidden"
              aria-label={menu ? "Close menu" : "Open menu"}
              aria-expanded={menu}
              aria-controls="mobile-nav"
              onClick={() => setMenu((m) => !m)}
            >
              {menu ? <X aria-hidden /> : <Menu aria-hidden />}
            </Button>
          </Container>
          {menu && (
            <nav id="mobile-nav" aria-label="Main" className="border-t border-line bg-bg md:hidden">
              <Container className="flex flex-col gap-1 py-3">
                {NAV.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "flex h-11 cursor-pointer items-center rounded-control px-3 text-body transition-colors",
                        isActive ? "bg-surface-2 font-medium text-fg" : "text-muted hover:bg-surface hover:text-fg",
                      )
                    }
                  >
                    {n.label}
                  </NavLink>
                ))}
                <RankedStatus className="mt-2 justify-center" />
              </Container>
            </nav>
          )}
        </header>
        {landing ? (
          <main className="relative flex-1 pb-16 sm:pb-24">{children}</main>
        ) : (
          <main className="relative flex-1 pt-8 pb-16 sm:pt-16 sm:pb-24">
            <Container>{children}</Container>
          </main>
        )}
        <footer className="relative border-t border-line">
          <Container className="flex flex-col gap-2 py-6 text-caption text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} LCF</span>
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Logo: <span className="text-fg">Cuttlef1sh</span>
              </span>
              <span>
                Tool icons: <span className="text-fg">debbicar</span> and <span className="text-fg">honee</span>
              </span>
            </span>
          </Container>
        </footer>
      </div>
    </ClickSpark>
  );
}
