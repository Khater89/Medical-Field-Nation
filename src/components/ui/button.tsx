import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Material Design 3 button hierarchy mapped onto shadcn variants.
 * Existing variant names are preserved for backwards compatibility:
 *   default     → M3 Filled
 *   secondary   → M3 Filled Tonal
 *   outline     → M3 Outlined
 *   ghost       → M3 Text (state layer)
 *   link        → M3 Text-only inline
 *   destructive → M3 Filled (error)
 * New variants:
 *   tonal       → M3 Filled Tonal (explicit alias)
 *   elevated    → M3 Elevated Button
 *   fab         → M3 Floating Action Button (icon)
 *   "extended-fab" → M3 Extended FAB
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-medium tracking-wide",
    "ring-offset-background",
    "transition-[background-color,color,box-shadow,transform]",
    "[transition-duration:var(--m3-duration-short3)]",
    "[transition-timing-function:var(--m3-easing-standard)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "m3-state-layer m3-ripple",
    "relative select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        // M3 Filled
        default:
          "bg-primary text-primary-foreground hover:m3-elevation-1 active:m3-elevation-0 shadow-none rounded-full",
        // M3 Filled (error)
        destructive:
          "bg-destructive text-destructive-foreground hover:m3-elevation-1 rounded-full",
        // M3 Outlined
        outline:
          "border border-input bg-transparent text-foreground hover:bg-accent rounded-full",
        // M3 Filled Tonal
        secondary:
          "bg-secondary/15 text-secondary-foreground hover:bg-secondary/25 rounded-full",
        tonal:
          "bg-primary/12 text-primary hover:bg-primary/20 rounded-full",
        // M3 Text
        ghost:
          "bg-transparent text-foreground hover:bg-accent rounded-full",
        link: "text-primary underline-offset-4 hover:underline rounded-none",
        // M3 Elevated
        elevated:
          "bg-card text-primary m3-elevation-1 hover:m3-elevation-2 rounded-full",
        // M3 FAB
        fab:
          "bg-primary text-primary-foreground m3-elevation-3 hover:m3-elevation-4 rounded-2xl",
        "extended-fab":
          "bg-primary text-primary-foreground m3-elevation-3 hover:m3-elevation-4 rounded-2xl px-5",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 rounded-full px-4 text-xs",
        lg: "h-12 rounded-full px-8 text-base",
        icon: "h-10 w-10 rounded-full",
        fab: "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
