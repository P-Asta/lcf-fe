import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import type { ComponentProps } from "react";
import { LAYER } from "@/lib/layers";
import { cn } from "@/lib/utils";

export const HoverCard = (props: ComponentProps<typeof HoverCardPrimitive.Root>) => (
  <HoverCardPrimitive.Root openDelay={250} closeDelay={100} {...props} />
);

export const HoverCardTrigger = HoverCardPrimitive.Trigger;

export function HoverCardContent({ className, align = "start", sideOffset = 8, ...props }: ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(LAYER.popover, "w-72 rounded-card bg-surface-2 p-4 text-fg shadow-float outline-none", className)}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}
