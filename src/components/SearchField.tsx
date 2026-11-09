import { Search } from "lucide-react";
import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { useSlashFocus } from "@/hooks/useSlashFocus";
import { cn } from "@/lib/utils";

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
};

export function SearchField({ value, onChange, placeholder, className }: SearchFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  useSlashFocus(ref);
  return (
    <div className={cn("relative w-full sm:w-80", className)}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            e.currentTarget.blur();
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pr-12 pl-10 [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 flex h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded-control bg-surface-3 px-2 text-caption text-muted">
        /
      </kbd>
    </div>
  );
}
