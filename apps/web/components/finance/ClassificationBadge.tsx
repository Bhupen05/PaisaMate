type Classification = "NEED" | "WANT" | "DREAM";

const LABEL: Record<Classification, string> = {
  NEED: "Need",
  WANT: "Want",
  DREAM: "Dream",
};

interface ClassificationBadgeProps {
  value: Classification;
}

export function ClassificationBadge({ value }: ClassificationBadgeProps) {
  const cls = value === "NEED" ? "badge-need" : value === "WANT" ? "badge-want" : "badge-dream";
  return <span className={`badge ${cls}`}>{LABEL[value]}</span>;
}
