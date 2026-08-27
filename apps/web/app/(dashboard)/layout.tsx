"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  // Prevent flash of content before client-side auth check
  if (!mounted || !isAuthenticated || !user) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "var(--color-bg)",
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid var(--color-border)",
          borderTopColor: "var(--color-accent)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="main-content-wrapper" style={{
        flex: 1,
        paddingLeft: "var(--sidebar-width)",
        paddingBottom: "0px",
        transition: "all var(--transition-normal)",
        backgroundColor: "var(--color-bg)",
      }}>
        <div style={{
          padding: "var(--space-6)",
          maxWidth: "1200px",
          margin: "0 auto",
        }}>
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav />

      <style jsx global>{`
        @media (max-width: 768px) {
          .main-content-wrapper {
            padding-left: 0px !important;
            padding-bottom: 60px !important;
          }
        }
      `}</style>
    </div>
  );
}
