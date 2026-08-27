"use client";

import { useState } from "react";

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div role="alert" style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "var(--space-3)",
      padding: "var(--space-3) var(--space-4)",
      backgroundColor: "var(--color-danger-bg)",
      color: "var(--color-danger)",
      border: "1px solid var(--color-danger)",
      borderRadius: "var(--radius-md)",
      fontSize: "var(--text-sm)",
      marginBottom: "var(--space-4)",
    }}>
      <span style={{ lineHeight: 1.5 }}>{message}</span>
      <button
        aria-label="Dismiss error"
        onClick={() => { setDismissed(true); onDismiss?.(); }}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-danger)",
          cursor: "pointer",
          padding: 0,
          fontSize: "var(--text-lg)",
          lineHeight: 1,
          flexShrink: 0,
        }}
      >×</button>
    </div>
  );
}
