"use client";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = "var(--radius-sm)", style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        background: "linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-border) 50%, var(--color-surface-2) 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.4s infinite",
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <Skeleton height={18} width="60%" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Skeleton key={i} height={13} width={i === lines - 2 ? "40%" : "90%"} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-3) 0", borderBottom: "1px solid var(--color-border)" }}>
      <Skeleton width={36} height={36} borderRadius="50%" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <Skeleton height={14} width="50%" />
        <Skeleton height={12} width="30%" />
      </div>
      <Skeleton height={16} width={64} />
    </div>
  );
}
