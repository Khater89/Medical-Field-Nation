import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Material Design 3 Card — defaults to Elevated.
 * Pass `variant="filled" | "outlined" | "elevated"` to switch.
 */
type CardVariant = "elevated" | "filled" | "outlined";

const cardVariantClasses: Record<CardVariant, string> = {
  elevated: "bg-card text-card-foreground m3-elevation-1 hover:m3-elevation-2 border-0",
  filled: "bg-muted/40 text-card-foreground border-0",
  outlined: "bg-card text-card-foreground border border-border",
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant = "elevated", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl transition-shadow",
      "[transition-duration:var(--m3-duration-short4)]",
      "[transition-timing-function:var(--m3-easing-standard)]",
      cardVariantClasses[variant],
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
