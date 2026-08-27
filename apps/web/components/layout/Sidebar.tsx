"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: "📊" },
  { label: "Transactions", path: "/transactions", icon: "💸" },
  { label: "Friends", path: "/friends", icon: "🤝" },
  { label: "Shared", path: "/shared", icon: "⚖️" },
  { label: "Settlements", path: "/settlements", icon: "💳" },
  { label: "Recurring", path: "/recurring", icon: "🔁" },
  { label: "Analytics", path: "/analytics", icon: "📈" },
  { label: "Settings", path: "/settings", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const activeTheme = document.documentElement.getAttribute("data-theme") as "light" | "dark" || "light";
    setTheme(activeTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("suraty_theme", nextTheme);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="sidebar-container" style={{
      width: "var(--sidebar-width)",
      backgroundColor: "var(--color-surface)",
      borderRight: "1px solid var(--color-border)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 100,
      transition: "width var(--transition-normal)",
      overflow: "hidden",
    }}>
      {/* Brand Header */}
      <div style={{
        padding: "var(--space-6) var(--space-5)",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
      }}>
        <span style={{ fontSize: "24px" }}>🪙</span>
        <h1 style={{
          fontSize: "var(--text-lg)",
          fontWeight: 800,
          color: "var(--color-primary)",
          letterSpacing: "-0.03em",
          margin: 0,
        }}>
          SURATY
        </h1>
      </div>

      {/* Navigation List */}
      <nav style={{
        flex: 1,
        padding: "var(--space-4) var(--space-3)",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        overflowY: "auto",
      }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-2) var(--space-4)",
                borderRadius: "var(--radius-md)",
                color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                backgroundColor: isActive ? "var(--color-accent-light)" : "transparent",
                fontWeight: isActive ? 600 : 500,
                fontSize: "var(--text-sm)",
                transition: "all var(--transition-fast)",
                textDecoration: "none",
              }}
              className="sidebar-link"
            >
              <span style={{ fontSize: "16px" }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Actions */}
      <div style={{
        padding: "var(--space-4)",
        borderTop: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}>
        {/* User Card */}
        {user && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-2)",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-surface-2)",
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "var(--color-accent)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "var(--text-xs)",
              textTransform: "uppercase",
            }}>
              {user.name.slice(0, 2)}
            </div>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <div style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: "var(--color-text)",
              }}>
                {user.name}
              </div>
              <div style={{
                fontSize: "10px",
                color: "var(--color-text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {user.email}
              </div>
            </div>
          </div>
        )}

        {/* Action Row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-2)",
        }}>
          <button
            onClick={toggleTheme}
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, fontSize: "11px", height: "30px" }}
            title="Toggle theme"
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm"
            style={{
              flex: 1,
              fontSize: "11px",
              height: "30px",
              color: "var(--color-danger)",
              border: "1px solid transparent",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      <style jsx global>{`
        .sidebar-link:hover {
          background-color: var(--color-surface-2) !important;
          color: var(--color-text) !important;
          transform: translateX(2px);
        }
        @media (max-width: 768px) {
          .sidebar-container {
            display: none !important;
          }
        }
      `}</style>
    </aside>
  );
}
