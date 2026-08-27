"use client";

interface LoadingSpinnerProps {
  size?: number;
  centered?: boolean;
}

export function LoadingSpinner({ size = 32, centered = false }: LoadingSpinnerProps) {
  const spinner = (
    <div
      role="status"
      aria-label="Loading"
      style={{
        width: size,
        height: size,
        border: `${Math.max(2, size / 10)}px solid var(--color-border)`,
        borderTopColor: "var(--color-accent)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        flexShrink: 0,
      }}
    />
  );

  if (centered) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "var(--space-16) 0",
      }}>
        {spinner}
      </div>
    );
  }

  return spinner;
}
