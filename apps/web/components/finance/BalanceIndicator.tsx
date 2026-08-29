export interface BalanceStatus {
  label: "Owes you" | "You owe" | "Settled";
  color: string;
  isOwed: boolean;
}

/**
 * Single source of truth for balance sign semantics: net_balance_minor > 0
 * means the friend owes the user; < 0 means the user owes the friend.
 * Never invert this, and always pair the color with this label — color
 * alone must never carry the meaning (Suraty UI/UX Spec §3.3, §8).
 */
export function getBalanceStatus(netBalanceMinor: number): BalanceStatus {
  if (netBalanceMinor > 0) {
    return { label: "Owes you", color: "var(--color-success)", isOwed: true };
  }
  if (netBalanceMinor < 0) {
    return { label: "You owe", color: "var(--color-danger)", isOwed: false };
  }
  return { label: "Settled", color: "var(--color-text-muted)", isOwed: false };
}
