import { cva, type VariantProps } from "class-variance-authority";
import { RANK_COLORS, hasRank, rankLabel, rankName } from "@/lib/ranks";
import { cn } from "@/lib/utils";

const rankBadgeVariants = cva("inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-control font-extrabold", {
  variants: {
    size: {
      sm: "h-6 min-w-8 px-1 text-caption",
      md: "h-8 min-w-10 px-2 text-body",
    },
  },
  defaultVariants: { size: "sm" },
});

const inkFor = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.55 ? "#111611" : "#ffffff";
};

export function RankBadge({ rank, size, className }: { rank?: string | null; className?: string } & VariantProps<typeof rankBadgeVariants>) {
  if (!hasRank(rank)) return null;
  const bg = RANK_COLORS[rank!] ?? "#828282";
  return (
    <span className={cn(rankBadgeVariants({ size }), className)} style={{ backgroundColor: bg, color: inkFor(bg) }} title={rankName(rank)}>
      {rankLabel(rank)}
    </span>
  );
}
