import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const SWATCHES = [
  "#ff3b1f", "#f0602a", "#fdac0d", "#ffe066", "#d8af0e", "#b8860b",
  "#52b752", "#1fa834", "#3bb687", "#4f99c0", "#4f64c9", "#5650c7",
  "#733e8f", "#ff45ff", "#ff7ab6", "#f2e8e8", "#b39a9a", "#54001f",
];

const HEX = /^#[0-9a-f]{6}$/;

type ColorPickerProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
};

export function ColorPicker({ value, onChange, label, className }: ColorPickerProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = (v: string) => {
    const hex = (v.startsWith("#") ? v : `#${v}`).toLowerCase();
    if (HEX.test(hex)) onChange(hex);
    else setDraft(value);
  };

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
                onClick={() => onChange(c)}
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
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(e.currentTarget.value.trim());
          }}
          className="tabular-nums"
        />
      </PopoverContent>
    </Popover>
  );
}
