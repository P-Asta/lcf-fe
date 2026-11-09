import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentProps } from "react";
import { LAYER } from "@/lib/layers";
import { cn } from "@/lib/utils";

export const TooltipProvider = (props: ComponentProps<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider delayDuration={150} {...props} />
);

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(LAYER.tooltip, "max-w-64 rounded-control bg-surface-3 px-3 py-2 text-caption text-fg shadow-float", className)}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
