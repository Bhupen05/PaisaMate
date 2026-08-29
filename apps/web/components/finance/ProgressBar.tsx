interface ProgressBarProps {
  value: number;
  color: string;
}

export function ProgressBar({ value, color }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
