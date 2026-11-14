import { Ban, Car, Wrench } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toolLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Server tool id -> image in /public/tools. Ids not listed fall back to `/tools/<id>.png`. */
const TOOL_IMAGES: Record<string, string | null> = {
  flash: "flashlight",
  flashlight: "flashlight",
  proflashlight: "proflashlight",
  keys: "key",
  spray_paint: "sprazypaint",
  key: "key",
  cruiser: null,
};

const KNOWN = new Set([
  "ammo", "beltbag", "binoculars", "boombox", "doublebarrel", "flashlight", "jetpack", "key", "knife", "ladder", "lockpicker", "manual",
  "mapper", "proflashlight", "radarbooster", "shovel", "sprazypaint", "stickynote", "stungrenade", "tzp", "walkie", "weedkiller", "zapgun",
]);

export function toolImage(tool: string): string | null {
  const name = tool in TOOL_IMAGES ? TOOL_IMAGES[tool] : tool;
  return name && KNOWN.has(name) ? `/tools/${name}.png` : null;
}

type ToolIconProps = { tool: string; className?: string };

/** The tool's in-game icon, or a generic glyph for tools without one (the Cruiser). */
export function ToolIcon({ tool, className }: ToolIconProps) {
  const src = toolImage(tool);
  if (src) return <img src={src} alt="" loading="lazy" decoding="async" className={cn("size-8 shrink-0 object-contain", className)} />;
  const Glyph = tool === "cruiser" ? Car : Wrench;
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center text-muted", className)}>
      <Glyph aria-hidden className="size-3/5" />
    </span>
  );
}

/** A banned tool: icon tile with a ban mark, the label below. */
export function BannedTool({ tool, className }: ToolIconProps) {
  const label = toolLabel(tool);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <li
          tabIndex={0}
          aria-label={`${label} (banned)`}
          className={cn("flex w-16 cursor-help flex-col items-center gap-1 rounded-control outline-none sm:w-18", className)}
        >
          <span className="relative flex size-14 items-center justify-center rounded-card bg-surface-2 sm:size-16">
            <ToolIcon tool={tool} className="size-11 opacity-80 grayscale-[35%] sm:size-12" />
            <span aria-hidden className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-pill bg-danger text-bg ring-2 ring-surface">
              <Ban className="size-3.5" strokeWidth={3} />
            </span>
          </span>
          <span className="w-full truncate text-center text-caption text-muted">{label}</span>
        </li>
      </TooltipTrigger>
      <TooltipContent>{label} cannot be bought or used.</TooltipContent>
    </Tooltip>
  );
}

export function BannedTools({ tools, className }: { tools: string[]; className?: string }) {
  if (tools.length === 0) return <span className={cn("text-caption text-muted", className)}>Every tool allowed</span>;
  return (
    <ul aria-label="Banned tools" className={cn("flex flex-wrap gap-2", className)}>
      {tools.map((t) => (
        <BannedTool key={t} tool={t} />
      ))}
    </ul>
  );
}
