import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Material Design 3 Text Field — Outlined (default) and Filled variants.
 * Logic and form behavior preserved; only the visual layer is restyled.
 */
type InputVariant = "outlined" | "filled";

interface InputProps extends React.ComponentProps<"input"> {
  variant?: InputVariant;
}

const variantClasses: Record<InputVariant, string> = {
  outlined: [
    "border border-input bg-transparent",
    "hover:border-foreground/60",
    "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
  ].join(" "),
  filled: [
    "border-0 bg-muted/60",
    "hover:bg-muted/80",
    "focus-visible:bg-muted/90 focus-visible:ring-2 focus-visible:ring-primary/40",
    "border-b-2 border-transparent focus-visible:border-primary",
  ].join(" "),
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "outlined", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl px-4 py-2 text-base",
          "ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "transition-[border-color,background-color,box-shadow]",
          "[transition-duration:var(--m3-duration-short3)]",
          "[transition-timing-function:var(--m3-easing-standard)]",
          "focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "md:text-sm",
          variantClasses[variant],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
