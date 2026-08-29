import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  sub?: string;
  decorColor?: string;
  variant?: "default" | "hero";
}

export function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  decorColor = "var(--color-accent)",
  variant = "default",
}: StatCardProps) {
  const isHero = variant === "hero";

  return (
    <div className={`card stat-card ${isHero ? "stat-card-hero" : ""}`}>
      {!isHero && <div className="stat-card-decor" style={{ color: decorColor }} />}
      <div className="stat-card-label">
        {Icon && <Icon size={14} />}
        {label}
      </div>
      <div className="stat-card-value" style={{ color: isHero ? "var(--color-hero-text)" : decorColor }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: "var(--text-xs)",
          color: isHero ? "rgba(255, 255, 255, 0.65)" : "var(--color-text-muted)",
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}
