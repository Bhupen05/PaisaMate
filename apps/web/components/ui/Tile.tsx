"use client";

import type { LucideIcon } from "lucide-react";

interface TileProps {
  selected: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

export function Tile({ selected, onClick, icon: Icon, label, sublabel, disabled }: TileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`tile ${selected ? "tile-selected" : ""}`}
    >
      {Icon && <Icon size={18} style={{ flexShrink: 0 }} />}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: "var(--text-xs)", opacity: 0.8, marginTop: 2 }}>{sublabel}</div>
        )}
      </div>
    </button>
  );
}
