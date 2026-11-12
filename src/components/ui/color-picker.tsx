import { Check } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const SWATCHES = [
  "#ff3b1f", "#f0602a", "#fdac0d", "#ffe066", "#d8af0e", "#b8860b",
  "#52b752", "#1fa834", "#3bb687", "#4f99c0", "#4f64c9", "#5650c7",
  "#733e8f", "#ff45ff", "#ff7ab6", "#f2e8e8", "#b39a9a", "#54001f",
];

const HEX = /^#[0-9a-f]{6}$/;

/** h 0-360, s/v 0-1 */
type Hsv = { h: number; s: number; v: number };

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

function hexToHsv(hex: string): Hsv {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

function hsvToHex({ h, s, v }: Hsv): string {
  const f = (k: number) => {
    const x = (k + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(x, 4 - x, 1));
  };
  return `#${[f(5), f(3), f(1)].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")}`;
}

/** "#abc", "abc", "#AABBCC", "aabbcc" -> "#aabbcc", or null. */
function normalizeHex(v: string): string | null {
  let s = v.trim().toLowerCase().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(s)) s = s.replace(/./g, "$&$&");
  return HEX.test(`#${s}`) ? `#${s}` : null;
}

/** Pointer drag over an element, reporting the position as 0-1 fractions. */
function useDrag(onMove: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const report = (e: PointerEvent<HTMLDivElement>) => {
    const r = ref.current!.getBoundingClientRect();
    onMove(clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height));
  };
  return {
    ref,
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.focus();
      report(e);
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) report(e);
    },
  };
}

const arrow = (e: KeyboardEvent, step: number): [number, number] | null => {
  const s = e.shiftKey ? step * 10 : step;
  switch (e.key) {
    case "ArrowLeft": return [-s, 0];
    case "ArrowRight": return [s, 0];
    case "ArrowUp": return [0, -s];
    case "ArrowDown": return [0, s];
    default: return null;
  }
};

const thumb = "pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]";
const focusRing = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-300";

type ColorPickerProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
};

export function ColorPicker({ value, onChange, label, className }: ColorPickerProps) {
  const [draft, setDraft] = useState(value);
  // Kept separately so hue survives dragging to black/white/grey.
  const [hsv, setHsv] = useState(() => hexToHsv(HEX.test(value) ? value : "#ff0000"));

  useEffect(() => {
    setDraft(value);
    if (HEX.test(value)) setHsv((cur) => (hsvToHex(cur) === value ? cur : hexToHsv(value)));
  }, [value]);

  const apply = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setDraft(hex);
    if (hex !== value) onChange(hex);
  };

  const commit = (v: string) => {
    const hex = normalizeHex(v);
    if (hex) {
      setDraft(hex);
      if (hex !== value) onChange(hex);
    } else setDraft(value);
  };

  const sv = useDrag((x, y) => apply({ ...hsv, s: x, v: 1 - y }));
  const hue = useDrag((x) => apply({ ...hsv, h: x * 360 }));

  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className={cn(
          "flex h-9 cursor-pointer items-center gap-2 rounded-pill bg-surface pr-4 pl-1.5 text-body text-fg tabular-nums transition-colors outline-none hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary-400 data-[state=open]:bg-surface-2",
          className,
        )}
      >
        <span className="size-6 shrink-0 rounded-pill" style={{ backgroundColor: value }} />
        {value}
      </PopoverTrigger>
      <PopoverContent className="flex w-60 flex-col gap-3">
        <div
          {...sv}
          role="slider"
          tabIndex={0}
          aria-label={`${label} saturation and brightness`}
          aria-valuetext={`saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
          onKeyDown={(e) => {
            const d = arrow(e, 0.01);
            if (!d) return;
            e.preventDefault();
            apply({ ...hsv, s: clamp(hsv.s + d[0]), v: clamp(hsv.v - d[1]) });
          }}
          className={cn("relative h-36 w-full cursor-crosshair touch-none rounded-control", focusRing)}
          style={{
            backgroundColor: `hsl(${hsv.h} 100% 50%)`,
            backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
          }}
        >
          <span className={thumb} style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: hsvToHex(hsv) }} />
        </div>
        <div
          {...hue}
          role="slider"
          tabIndex={0}
          aria-label={`${label} hue`}
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(hsv.h)}
          onKeyDown={(e) => {
            const d = arrow(e, 1);
            if (!d) return;
            e.preventDefault();
            apply({ ...hsv, h: clamp(hsv.h + d[0] - d[1], 0, 360) });
          }}
          className={cn("relative h-3 w-full cursor-pointer touch-none rounded-pill", focusRing)}
          style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
        >
          <span className={cn(thumb, "top-1/2")} style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: `hsl(${hsv.h} 100% 50%)` }} />
        </div>
        <div role="listbox" aria-label={label} className="grid grid-cols-6 gap-2">
          {SWATCHES.map((c) => {
            const selected = c === value;
            return (
              <button
                key={c}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={c}
                onClick={() => commit(c)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-pill transition-transform outline-none hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-300 active:scale-95"
                style={{ backgroundColor: c }}
              >
                {selected && <Check aria-hidden className="size-4 text-white mix-blend-difference" />}
              </button>
            );
          })}
        </div>
        <Input
          aria-label={`${label} hex`}
          value={draft}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            setDraft(e.target.value);
            // Apply as soon as a full 6-digit hex is typed; 3-digit/short forms apply on Enter/blur.
            const s = e.target.value.trim().replace(/^#/, "");
            if (s.length === 6) {
              const hex = normalizeHex(s);
              if (hex && hex !== value) onChange(hex);
            }
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(e.currentTarget.value);
          }}
          className="tabular-nums"
        />
      </PopoverContent>
    </Popover>
  );
}
