import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ElementType } from "react";
import { cn } from "@/lib/utils";

export const textVariants = cva("", {
  variants: {
    variant: {
      display: "text-display",
      headline: "text-headline",
      stat: "text-stat tabular-nums",
      title: "text-title",
      body: "text-body",
      label: "text-label uppercase",
      caption: "text-caption",
    },
    tone: {
      default: "text-fg",
      muted: "text-muted",
      accent: "text-primary-300",
      danger: "text-danger",
      inherit: "",
    },
  },
  defaultVariants: { variant: "body", tone: "default" },
});

type TextProps<T extends ElementType> = { as?: T } & VariantProps<typeof textVariants> & Omit<ComponentProps<T>, "as">;

export function Text<T extends ElementType = "p">({ as, variant, tone, className, ...props }: TextProps<T>) {
  const Comp = (as ?? "p") as ElementType;
  return <Comp className={cn(textVariants({ variant, tone }), className)} {...props} />;
}

export const Headline = (p: TextProps<"h1">) => <Text as="h1" variant="headline" {...p} />;
export const Title = (p: TextProps<"h2">) => <Text as="h2" variant="title" {...p} />;
export const Label = (p: TextProps<"span">) => <Text as="span" variant="label" tone="muted" {...p} />;
export const Caption = (p: TextProps<"span">) => <Text as="span" variant="caption" tone="muted" {...p} />;
