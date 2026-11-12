import { useRef, useState, type FormEvent } from "react";
import { FlowingPrefix } from "@/components/NamePrefix";
import { Caption } from "@/components/typography/Text";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/select";
import { useClock } from "@/hooks/useClock";
import { useSlashFocus } from "@/hooks/useSlashFocus";
import { RANK_COLORS } from "@/lib/ranks";
import { cn } from "@/lib/utils";

const GAME_NAME = "#ff0000";
const GAME_TEXT = "#ffff00";
const GAME_SYSTEM = "#7069ff";
const MAX_LINES = 8;
const MAX_CHARS = 49;

type Prefix = { text: string; colors: string[] } | null;

const PREFIXES: Record<string, { label: string; prefix: Prefix }> = {
  none: { label: "No badge", prefix: null },
  tier: { label: "Tier badge", prefix: { text: "INT3", colors: [RANK_COLORS.int3] } },
  dev: { label: "Developer (gradient)", prefix: { text: "DEV", colors: ["#ffe066", "#b8860b"] } },
  zed: { label: "Zed Dog tier", prefix: { text: "ZED", colors: [RANK_COLORS.zed] } },
};

type Line = { id: number; name?: string; prefix?: Prefix; text: string };

const SEED: Line[] = [
  { id: 1, text: "[LCF]: glhf" },
  { id: 2, name: "Astaaaaaaaa", prefix: PREFIXES.dev.prefix, text: "gl" },
  { id: 3, name: "munyaa", prefix: PREFIXES.tier.prefix, text: "the fire exit is mine" },
];

function ChatLine({ line, seconds }: { line: Line; seconds: number }) {
  if (!line.name) return <p style={{ color: GAME_SYSTEM }}>{line.text}</p>;
  return (
    <p>
      {line.prefix && (
        <>
          <FlowingPrefix text={line.prefix.text} colors={line.prefix.colors} seconds={seconds} />{" "}
        </>
      )}
      <span style={{ color: GAME_NAME }}>{line.name}</span>
      <span style={{ color: GAME_NAME }}>: </span>
      <span style={{ color: GAME_TEXT }}>&apos;{line.text}&apos;</span>
    </p>
  );
}

export function ChatDemo({ className }: { className?: string }) {
  const [lines, setLines] = useState<Line[]>(SEED);
  const [draft, setDraft] = useState("");
  const [badge, setBadge] = useState("dev");
  const nextId = useRef(SEED.length + 1);
  const inputRef = useRef<HTMLInputElement>(null);
  useSlashFocus(inputRef);
  const seconds = useClock();

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setLines((l) => [...l, { id: nextId.current++, name: "You", prefix: PREFIXES[badge].prefix, text }].slice(-MAX_LINES));
    setDraft("");
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Caption className="text-body">Pick a badge, type and press Enter. Gradient prefixes flow like in game.</Caption>
        <OptionSelect
          label="Badge worn"
          className="w-56"
          value={badge}
          onChange={setBadge}
          options={Object.entries(PREFIXES).map(([value, p]) => ({ value, label: p.label }))}
        />
      </div>
      <div className="flex min-h-72 flex-col justify-end gap-3 rounded-card bg-bg p-6 font-mono text-body">
        <div role="log" aria-live="polite" aria-label="In-game chat" className="flex flex-col gap-1">
          {lines.map((l) => (
            <ChatLine key={l.id} line={l} seconds={seconds} />
          ))}
        </div>
        <form onSubmit={send}>
          <label className="sr-only" htmlFor="chat-demo-input">
            Chat message
          </label>
          <Input
            ref={inputRef}
            id="chat-demo-input"
            value={draft}
            maxLength={MAX_CHARS}
            autoComplete="off"
            onChange={(e) => setDraft(e.target.value)}
            placeholder={'Press "/" to talk.'}
            className="rounded-control bg-surface font-mono italic hover:bg-surface-2"
            style={{ color: GAME_TEXT }}
          />
        </form>
      </div>
    </div>
  );
}
