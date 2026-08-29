"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ReceiptText,
  Users,
  Handshake,
  Wallet,
  Repeat,
  BarChart3,
  Settings as SettingsIcon,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", path: "/transactions", icon: ReceiptText },
  { label: "Friends", path: "/friends", icon: Users },
  { label: "Shared", path: "/shared", icon: Handshake },
  { label: "Settlements", path: "/settlements", icon: Wallet },
  { label: "Recurring", path: "/recurring", icon: Repeat },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
];

const SETTINGS_ITEM = { label: "Settings", path: "/settings", icon: SettingsIcon };

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const activeTheme = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
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

  const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: isActive ? 600 : 500,
    textDecoration: "none",
    color: isActive ? "#FFFFFF" : "var(--color-text-secondary)",
    background: isActive ? "var(--color-accent)" : "transparent",
    boxShadow: isActive ? "var(--shadow-xs)" : "none",
    transition: "background var(--transition-fast), color var(--transition-fast)",
    letterSpacing: "0.01em",
  });

  return (
    <aside className="sidebar-container" style={{
      width: "var(--sidebar-width)",
      backgroundColor: "var(--color-bg)",
      borderRight: "1px solid var(--color-border)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 100,
      overflow: "hidden",
    }}>
      {/* Brand Header */}
      <div style={{
        padding: "18px 16px",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <div style={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          background: "var(--color-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          flexShrink: 0,
          boxShadow: "var(--shadow-xs)",
        }}>🪙</div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: "18px",
            lineHeight: "22px",
            fontWeight: 800,
            color: "var(--color-text)",
            letterSpacing: "-0.02em",
          }}>
            Suraty
          </div>
          <p style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--color-text-muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: 0,
          }}>
            Personal Finance
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="custom-scrollbar" style={{
        flex: 1,
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        overflowY: "auto",
      }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              style={navLinkStyle(isActive)}
              className={isActive ? "sidebar-link sidebar-link-active" : "sidebar-link"}
            >
              <Icon size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Settings pinned toward bottom */}
        <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px solid var(--color-border)" }}>
          <Link
            href={SETTINGS_ITEM.path}
            style={navLinkStyle(pathname === SETTINGS_ITEM.path)}
            className={pathname === SETTINGS_ITEM.path ? "sidebar-link sidebar-link-active" : "sidebar-link"}
          >
            <SettingsIcon size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span>Settings</span>
          </Link>
        </div>
      </nav>

      {/* Footer Profile & Actions */}
      <div style={{
        padding: "12px",
        borderTop: "1px solid var(--color-border)",
        backgroundColor: "var(--color-bg-secondary)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}>
        {/* User Card */}
        {user && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px",
            borderRadius: "10px",
          }}>
            <div style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              backgroundColor: "var(--color-accent)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "12px",
              textTransform: "uppercase",
              flexShrink: 0,
              boxShadow: "var(--shadow-xs)",
            }}>
              {user.name.slice(0, 2)}
            </div>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
              <div style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--color-text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {user.name}
              </div>
              <div style={{
                fontSize: "10px",
                color: "var(--color-text-muted)",
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
          gap: "8px",
        }}>
          <button
            onClick={toggleTheme}
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, fontSize: "11px", height: "30px", gap: "6px" }}
            title="Toggle theme"
          >
            {theme === "light" ? <Moon size={13} /> : <Sun size={13} />}
            {theme === "light" ? "Dark" : "Light"}
          </button>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm"
            style={{
              flex: 1,
              fontSize: "11px",
              height: "30px",
              gap: "6px",
              color: "var(--color-danger)",
              border: "1px solid transparent",
            }}
          >
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </div>

      <style jsx global>{`
        .sidebar-link:not(.sidebar-link-active):hover {
          background-color: var(--color-surface-2) !important;
          color: var(--color-text) !important;
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
