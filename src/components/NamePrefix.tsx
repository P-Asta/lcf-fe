import { Caption } from "@/components/typography/Text";
import { Stack } from "@/components/layout/Stack";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BadgeStyle } from "@/lib/api";

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (c: number[]) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

export function prefixLetters(text: string, colors: string[]) {
  const chars = Array.from(`[${text}]`);
  const [a, b] = colors;
  return chars.map((ch, i) => {
    if (!a) return { ch, color: undefined };
    if (!b || chars.length < 2) return { ch, color: a };
    const t = i / (chars.length - 1);
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    return { ch, color: rgbToHex(ca.map((v, k) => v + (cb[k] - v) * t)) };
  });
}

const SPEED = 0.35;
const SPAN = 0.5;

const mix = (a: number[], b: number[], t: number) => rgbToHex(a.map((v, k) => v + (b[k] - v) * t));

export function flowLetters(text: string, colors: string[], seconds: number) {
  const chars = Array.from(`[${text}]`);
  if (colors.length < 2) return prefixLetters(text, colors);
  const stops = colors.map(hexToRgb);
  const n = chars.length;
  return chars.map((ch, k) => {
    const s = (n <= 1 ? 0 : k / (n - 1)) * SPAN - seconds * SPEED;
    const t = 1 - Math.abs(2 * (s - Math.floor(s)) - 1);
    const f = t * (stops.length - 1);
    const i = Math.min(Math.floor(f), stops.length - 2);
    return { ch, color: mix(stops[i], stops[i + 1], f - i) };
  });
}

export function FlowingPrefix({ text, colors, seconds }: { text: string; colors: string[]; seconds: number }) {
  return (
    <>
      {flowLetters(text, colors, seconds).map((l, i) => (
        <span key={i} style={{ color: l.color }}>
          {l.ch}
        </span>
      ))}
    </>
  );
}

type PrefixPreviewProps ={ text: string; colors: string[]; fallback?: string; name?: string };

export function PrefixPreview({ text, colors, fallback, name }: PrefixPreviewProps) {
  if (!text) return null;
  const shown = colors.length > 0 ? colors : fallback ? [fallback] : [];
  return (
    <span className="tabular-nums">
      {prefixLetters(text, shown).map((l, i) => (
        <span key={i} style={{ color: l.color }}>
          {l.ch}
        </span>
      ))}
      {name !== undefined && <span className="text-muted"> {name}</span>}
    </span>
  );
}

type ColorMode = "default" | "solid" | "gradient";

const MODES: { value: ColorMode; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "solid", label: "Solid" },
  { value: "gradient", label: "Gradient" },
];

type PrefixFieldsProps = {
  style: BadgeStyle;
  onChange: (s: BadgeStyle) => void;
  defaultText: string;
  defaultColor?: string;
};

export function PrefixFields({ style, onChange, defaultText, defaultColor = "#fdac0d" }: PrefixFieldsProps) {
  const mode: ColorMode = style.color2 ? "gradient" : style.color1 ? "solid" : "default";
  const setMode = (m: ColorMode) =>
    onChange({
      ...style,
      color1: m === "default" ? "" : style.color1 || defaultColor,
      color2: m === "gradient" ? style.color2 || "#ff3b1f" : "",
    });
  const shownText = style.prefix.trim() || defaultText.trim();
  const colors = [style.color1, style.color2].filter(Boolean);

  return (
    <Stack gap={2}>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <label className="flex flex-col gap-1">
          <Caption>Name prefix</Caption>
          <Input
            value={style.prefix}
            maxLength={16}
            onChange={(e) => onChange({ ...style, prefix: e.target.value })}
            placeholder={defaultText.trim() ? `Empty = "${defaultText.trim()}"` : "Empty = the default"}
          />
        </label>
        <div className="flex flex-col gap-1">
          <Caption>Prefix color</Caption>
          <Select value={mode} onValueChange={(v) => setMode(v as ColorMode)}>
            <SelectTrigger aria-label="Prefix color mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {mode !== "default" && (
        <Stack direction="row" align="center" gap={2}>
          <ColorPicker label={mode === "gradient" ? "Gradient start" : "Prefix color"} value={style.color1 || defaultColor} onChange={(c) => onChange({ ...style, color1: c })} />
          {mode === "gradient" && <ColorPicker label="Gradient end" value={style.color2 || "#ff3b1f"} onChange={(c) => onChange({ ...style, color2: c })} />}
        </Stack>
      )}
      {shownText && (
        <Caption>
          In chat: <PrefixPreview text={shownText} colors={colors} fallback={defaultColor} name="PlayerName" />
        </Caption>
      )}
    </Stack>
  );
}
