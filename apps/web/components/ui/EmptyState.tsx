"use client";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = "📭", title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "var(--space-16) var(--space-6)",
      textAlign: "center",
      gap: "var(--space-3)",
    }}>
      <div style={{
        fontSize: "48px",
        lineHeight: 1,
        marginBottom: "var(--space-2)",
        color: "var(--color-text-muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>{icon}</div>
      <h3 style={{
        fontSize: "var(--text-lg)",
        fontWeight: 700,
        color: "var(--color-text)",
        margin: 0,
      }}>{title}</h3>
      {description && (
        <p style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-text-muted)",
          maxWidth: "320px",
          lineHeight: 1.6,
          margin: 0,
        }}>{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          className="btn btn-primary"
          onClick={onAction}
          style={{ marginTop: "var(--space-2)" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
