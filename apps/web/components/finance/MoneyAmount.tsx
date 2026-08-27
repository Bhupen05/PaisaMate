import { formatMinor } from "@/lib/money";

interface MoneyAmountProps {
  amountMinor: number;
  currency: string;
  /** positive = green, negative = red, auto = infer from value sign */
  variant?: "positive" | "negative" | "neutral" | "auto";
  size?: "sm" | "base" | "lg" | "xl" | "2xl";
  className?: string;
}

const SIZE_MAP = {
  sm:  "var(--text-sm)",
  base:"var(--text-base)",
  lg:  "var(--text-lg)",
  xl:  "var(--text-xl)",
  "2xl": "var(--text-2xl)",
};

export function MoneyAmount({ amountMinor, currency, variant = "auto", size = "base", className }: MoneyAmountProps) {
  let colorClass = "";
  if (variant === "auto") {
    colorClass = amountMinor > 0 ? "amount-positive" : amountMinor < 0 ? "amount-negative" : "amount-zero";
  } else if (variant === "positive") {
    colorClass = "amount-positive";
  } else if (variant === "negative") {
    colorClass = "amount-negative";
  }

  return (
    <span
      className={`amount ${colorClass} ${className ?? ""}`.trim()}
      style={{ fontSize: SIZE_MAP[size] }}
    >
      {formatMinor(Math.abs(amountMinor), currency)}
    </span>
  );
}
