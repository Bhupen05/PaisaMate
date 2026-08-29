"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface SuccessBannerProps {
  message: React.ReactNode;
  onDismiss?: () => void;
}

export function SuccessBanner({ message, onDismiss }: SuccessBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div role="status" style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "var(--space-3)",
      padding: "var(--space-3) var(--space-4)",
      backgroundColor: "var(--color-success-bg)",
      color: "var(--color-success)",
      border: "1px solid var(--color-success)",
      borderRadius: "var(--radius-md)",
      fontSize: "var(--text-sm)",
      marginBottom: "var(--space-4)",
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", lineHeight: 1.5 }}>
        <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
        {message}
      </span>
      <button
        aria-label="Dismiss message"
        onClick={() => { setDismissed(true); onDismiss?.(); }}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-success)",
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
