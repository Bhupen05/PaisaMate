"use client";

import Link from "next/link";

interface ListRowProps {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  href?: string;
}

export function ListRow({ leading, title, subtitle, trailing, onClick, href }: ListRowProps) {
  const content = (
    <>
      {leading && <div style={{ flexShrink: 0 }}>{leading}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600,
          fontSize: "var(--text-sm)",
          color: "var(--color-text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
      {trailing && <div style={{ flexShrink: 0 }}>{trailing}</div>}
    </>
  );

  if (href) {
    return <Link href={href} className="list-row">{content}</Link>;
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="list-row"
        style={{ width: "100%", border: "none", background: "none", font: "inherit" }}
      >
        {content}
      </button>
    );
  }

  return <div className="list-row">{content}</div>;
}
