import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaginationProps = { page: number; pages: number; onChange: (page: number) => void };

const windowOf = (page: number, pages: number) => {
  const span = 5;
  const start = Math.max(1, Math.min(page - Math.floor(span / 2), pages - span + 1));
  return Array.from({ length: Math.min(span, pages) }, (_, i) => start + i);
};

export function Pagination({ page, pages, onChange }: PaginationProps) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      <Button size="icon" variant="secondary" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft />
      </Button>
      {windowOf(page, pages).map((p) => (
        <Button
          key={p}
          size="icon"
          variant={p === page ? "primary" : "secondary"}
          aria-current={p === page ? "page" : undefined}
          aria-label={`Page ${p}`}
          onClick={() => onChange(p)}
          className="tabular-nums"
        >
          {p}
        </Button>
      ))}
      <Button size="icon" variant="secondary" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        <ChevronRight />
      </Button>
    </nav>
  );
}
