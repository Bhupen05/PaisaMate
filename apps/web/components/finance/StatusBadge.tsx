const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  SETTLED: { cls: "badge-settled", label: "Settled" },
  ACTIVE: { cls: "badge-active", label: "Active" },
  PENDING: { cls: "badge-pending", label: "Pending" },
  PAUSED: { cls: "badge-paused", label: "Paused" },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const entry = STATUS_MAP[status.toUpperCase()];

  if (!entry) {
    return (
      <span
        className="badge"
        style={{ background: "var(--color-surface-2)", color: "var(--color-text-secondary)" }}
      >
        {label ?? status}
      </span>
    );
  }

  return <span className={`badge ${entry.cls}`}>{label ?? entry.label}</span>;
}
