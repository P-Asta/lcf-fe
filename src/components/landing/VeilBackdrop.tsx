import DarkVeil from "@/components/reactbits/DarkVeil";
import { cn } from "@/lib/utils";

export function VeilBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 bg-bg", className)}>
      <DarkVeil color="#ff2a1a" speed={0.35} flow={1.2} warp={0.4} glow={0.6} brightness={0.85} grain={0.04} fade={0.6} />
    </div>
  );
}
