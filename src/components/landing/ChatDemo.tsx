import { useRef, useState, type FormEvent } from "react";
import { FlowingPrefix } from "@/components/NamePrefix";
import { Input } from "@/components/ui/input";
import { useClock } from "@/hooks/useClock";
import { useSlashFocus } from "@/hooks/useSlashFocus";
import { RANK_COLORS } from "@/lib/ranks";
import { cn } from "@/lib/utils";

const GAME_NAME = "#ff0000";
const GAME_TEXT = "#ffff00";
const GAME_SYSTEM = "#7069ff";
const MAX_LINES = 10;
const MAX_CHARS = 49;

type Prefix = { text: string; colors: string[] };
type Line = { id: number; name?: string; prefix?: Prefix; text: string };

const DEV: Prefix = { text: "DEV", colors: ["#ffe066", "#b8860b"] };
const INT: Prefix = { text: "INT3", colors: [RANK_COLORS.int3] };
const ZED: Prefix = { text: "ZED", colors: [RANK_COLORS.zed] };

/** The lobby chat shown on load. */
const SEED: Line[] = [
  { id: 1, text: "[LCF]: Match found. Same moon, same seed. glhf" },
  { id: 2, name: "munyaa", prefix: INT, text: "first ranked game, any tips?" },
  { id: 3, name: "Astaaaaaaaa", prefix: DEV, text: "grab the big scrap first, ship by 10pm" },
  { id: 4, name: "munyaa", prefix: INT, text: "the fire exit is mine" },
  { id: 5, name: "nightshift", prefix: ZED, text: "daily race is up too, one run counts" },
  { id: 6, name: "Astaaaaaaaa", prefix: DEV, text: "come play, the ladder needs you" },
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
      <span style={{ color: GAME_NAME }}>{line.name}: </span>
      <span style={{ color: GAME_TEXT }}>&apos;{line.text}&apos;</span>
    </p>
  );
}

/** In-game style lobby chat: the whole conversation is there, and you can add to it. */
export function ChatDemo({ className }: { className?: string }) {
  const [lines, setLines] = useState<Line[]>(SEED);
  const [draft, setDraft] = useState("");
  const nextId = useRef(SEED.length + 1);
  const inputRef = useRef<HTMLInputElement>(null);
  useSlashFocus(inputRef);
  const seconds = useClock();

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setLines((l) => [...l, { id: nextId.current++, name: "You", text }].slice(-MAX_LINES));
    setDraft("");
  };

  return (
    <div className={cn("flex min-h-72 flex-col justify-end gap-3 rounded-card bg-bg p-4 font-mono text-body break-words sm:p-6", className)}>
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
  );
}
