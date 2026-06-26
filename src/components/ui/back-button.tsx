import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
  variant?: "ghost" | "outline" | "secondary";
  size?: "sm" | "default" | "lg" | "icon";
}

/**
 * Universal back button. Defaults to navigate(-1) (browser history),
 * or navigates to `to` when provided. RTL-aware: shows arrow pointing right.
 */
export default function BackButton({
  to,
  label = "رجوع",
  className,
  variant = "ghost",
  size = "sm",
}: BackButtonProps) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (to) navigate(to);
    else if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn("gap-1.5", className)}
      aria-label={label}
    >
      <ArrowRight className="h-4 w-4" />
      {label}
    </Button>
  );
}
