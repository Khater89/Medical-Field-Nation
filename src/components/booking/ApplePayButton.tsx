import { cn } from "@/lib/utils";

interface ApplePayButtonProps {
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: "option" | "action";
  label?: string;
}

/**
 * Apple Pay branded button.
 * - Follows Apple Pay button guidelines: black background, white Apple logo + "Pay" wordmark,
 *   rounded corners, no other text inside.
 * - "option" variant = selectable card in a payment method grid
 * - "action" variant = full-width pay action button
 */
const ApplePayLogo = ({ size = 18 }: { size?: number }) => (
  <span className="inline-flex items-center gap-1 leading-none" style={{ fontSize: size }}>
    {/* Apple glyph */}
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path d="M16.365 1.43c0 1.14-.46 2.21-1.214 2.99-.81.84-2.13 1.49-3.22 1.4-.13-1.13.46-2.31 1.18-3.06.81-.85 2.18-1.48 3.25-1.51zM20.5 17.43c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.5-4.13 3.51-1.54.02-1.94-1.01-4.04-1-2.1.01-2.54 1.02-4.08 1-1.74-.02-3.07-1.78-4.06-3.34C-.06 15.95-.36 10.93 2.07 8.21c1.16-1.31 2.99-2.13 4.71-2.13 1.75 0 2.86.96 4.32.96 1.41 0 2.27-.96 4.3-.96 1.53 0 3.16.83 4.32 2.27-3.79 2.07-3.18 7.5.78 9.08z" />
    </svg>
    {/* "Pay" wordmark */}
    <span
      className="font-semibold tracking-tight"
      style={{ fontSize: size * 0.95, fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}
    >
      Pay
    </span>
  </span>
);

const ApplePayButton = ({
  selected,
  disabled,
  onClick,
  className,
  variant = "option",
  label,
}: ApplePayButtonProps) => {
  if (variant === "action") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "group relative w-full h-12 rounded-xl bg-black text-white",
          "flex items-center justify-center gap-2",
          "shadow-[0_4px_18px_-4px_rgba(0,0,0,0.45)]",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.6)]",
          "active:translate-y-0 active:scale-[0.99]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
          className,
        )}
        aria-label="Pay with Apple Pay"
      >
        {label && <span className="text-xs opacity-80 me-1">{label}</span>}
        <ApplePayLogo size={20} />
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative p-3 rounded-lg text-center transition-all duration-200 min-h-[68px]",
        "flex flex-col items-center justify-center gap-1.5",
        "bg-black text-white border-2",
        selected
          ? "border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/20 -translate-y-0.5"
          : "border-black/80 hover:border-primary/60 hover:shadow-md",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <ApplePayLogo size={18} />
      <span className="text-[10px] text-white/70 font-medium leading-none">
        لمسة واحدة
      </span>
    </button>
  );
};

export default ApplePayButton;
