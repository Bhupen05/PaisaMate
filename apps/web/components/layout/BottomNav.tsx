"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const MOBILE_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: "📊" },
  { label: "Expenses", path: "/transactions", icon: "💸" },
  { label: "Friends", path: "/friends", icon: "🤝" },
  { label: "Shared", path: "/shared", icon: "⚖️" },
  { label: "Settles", path: "/settlements", icon: "💳" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav-container" style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      width: "100%",
      height: "60px",
      backgroundColor: "var(--color-surface)",
      borderTop: "1px solid var(--color-border)",
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      zIndex: 100,
      boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
    }}>
      {MOBILE_ITEMS.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
              flex: 1,
              height: "100%",
              color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
              fontWeight: isActive ? 600 : 500,
              fontSize: "10px",
              textDecoration: "none",
              transition: "color var(--transition-fast)",
            }}
          >
            <span style={{ fontSize: "20px" }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}

      <style jsx global>{`
        /* Hide bottom nav on desktop screens */
        @media (min-width: 769px) {
          .bottom-nav-container {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}
