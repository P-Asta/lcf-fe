import { cva, type VariantProps } from "class-variance-authority";
import { UserRound } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const avatarVariants = cva("shrink-0 overflow-hidden bg-surface-3 text-muted", {
  variants: {
    size: {
      sm: "size-6 rounded-pill [&_svg]:size-4",
      md: "size-8 rounded-pill [&_svg]:size-5",
      lg: "size-12 rounded-control [&_svg]:size-7",
      xl: "size-18 rounded-card [&_svg]:size-10",
    },
  },
  defaultVariants: { size: "md" },
});

type AvatarProps = VariantProps<typeof avatarVariants> & { src?: string | null; name?: string | null; className?: string };

export function Avatar({ src, name, size, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn(avatarVariants({ size }), "inline-flex items-center justify-center", className)}>
      {src && !failed ? (
        <img src={src} alt={name ? `${name}'s avatar` : ""} loading="lazy" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <UserRound aria-hidden />
      )}
    </span>
  );
}
