"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ReceiptText,
  Users,
  Handshake,
  Wallet,
  Repeat,
  BarChart3,
  Settings as SettingsIcon,
  MoreHorizontal,
  X,
} from "lucide-react";

const PRIMARY_ITEMS = [
  { label: "Home", path: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", path: "/transactions", icon: ReceiptText },
  { label: "Friends", path: "/friends", icon: Users },
  { label: "Shared", path: "/shared", icon: Handshake },
];

const MORE_ITEMS = [
  { label: "Settlements", path: "/settlements", icon: Wallet },
  { label: "Recurring", path: "/recurring", icon: Repeat },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Settings", path: "/settings", icon: SettingsIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = MORE_ITEMS.some((item) => item.path === pathname);

  // Close the sheet on route change and lock scroll while open
  useEffect(() => { setMoreOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = moreOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [moreOpen]);

  const goTo = (path: string) => {
    setMoreOpen(false);
    router.push(path);
  };

  // Auto-close if the viewport grows into desktop width (bottom nav is
  // desktop-hidden via CSS, but state could otherwise linger open).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 769px)");
    const handle = () => { if (mq.matches) setMoreOpen(false); };
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, []);

  return (
    <>
      {moreOpen && (
        <div
          className="bottom-nav-container"
          role="presentation"
          onClick={() => setMoreOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 99,
          }}
        />
      )}

      {moreOpen && (
        <div
          className="bottom-nav-container"
          role="dialog"
          aria-modal="true"
          aria-label="More navigation"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: "60px",
            background: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
            borderTopLeftRadius: "var(--radius-lg)",
            borderTopRightRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-xl)",
            zIndex: 100,
            padding: "var(--space-3)",
            paddingBottom: "calc(var(--space-3) + env(safe-area-inset-bottom, 0px))",
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "var(--space-2)",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {MORE_ITEMS.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => goTo(item.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  background: isActive ? "var(--color-accent-light)" : "var(--color-surface-2)",
                  color: isActive ? "var(--color-accent)" : "var(--color-text)",
                  fontWeight: isActive ? 700 : 600,
                  fontSize: "var(--text-sm)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      <nav className="bottom-nav-container" style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "60px",
        backgroundColor: "color-mix(in srgb, var(--color-surface) 95%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid var(--color-border)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        zIndex: 100,
        boxShadow: "var(--shadow-lg)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {PRIMARY_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
                flex: 1,
                height: "100%",
                color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                fontWeight: isActive ? 700 : 500,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                textDecoration: "none",
                transform: isActive ? "scale(0.95)" : "scale(1)",
                transition: "color var(--transition-fast), transform var(--transition-fast)",
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          aria-label="More navigation"
          aria-expanded={moreOpen}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "3px",
            flex: 1,
            height: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: isMoreActive || moreOpen ? "var(--color-accent)" : "var(--color-text-secondary)",
            fontWeight: isMoreActive || moreOpen ? 700 : 500,
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            transform: isMoreActive || moreOpen ? "scale(0.95)" : "scale(1)",
            transition: "color var(--transition-fast), transform var(--transition-fast)",
          }}
        >
          {moreOpen ? <X size={20} strokeWidth={2.4} /> : <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.4 : 2} />}
          <span>More</span>
        </button>

        <style jsx global>{`
          /* Hide bottom nav on desktop screens */
          @media (min-width: 769px) {
            .bottom-nav-container {
              display: none !important;
            }
          }
        `}</style>
      </nav>
    </>
  );
}
