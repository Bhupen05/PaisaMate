"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SuccessBanner } from "@/components/ui/SuccessBanner";
import { Modal } from "@/components/ui/Modal";
import { Tile } from "@/components/ui/Tile";
import { Sun, Moon, LogOut } from "lucide-react";

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuthStore();

  // Profile form
  const [name, setName] = useState(user?.name ?? "");
  const [currency, setCurrency] = useState(user?.currency ?? "INR");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Appearance
  const [theme, setTheme] = useState<"light"|"dark">(() => {
    if (typeof document !== "undefined") {
      return (document.documentElement.getAttribute("data-theme") as "light"|"dark") ?? "light";
    }
    return "light";
  });

  // Logout confirm
  const [showLogout, setShowLogout] = useState(false);

  const handleTheme = (t: "light"|"dark") => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("suraty_theme", t);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      const res = await api.patch("/auth/me", { name: name.trim(), currency });
      updateUser({ name: res.data.name, currency: res.data.currency });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Unable to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: 2 }}>
            Manage your profile and preferences
          </p>
        </div>
      </div>

      {/* Profile section */}
      <section className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-5)" }}>Profile</h2>

        {success && (
          <SuccessBanner message="Settings saved successfully." onDismiss={() => setSuccess(false)} />
        )}
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="s-email">Email Address</label>
            <input id="s-email" type="email" disabled className="input" value={user?.email ?? ""}
              style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", cursor: "not-allowed" }} />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Email cannot be changed.</span>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="s-name">Full Name</label>
            <input id="s-name" className="input" required value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="s-currency">Default Currency</label>
            <select id="s-currency" className="input" value={currency} onChange={e => setCurrency(e.target.value)} style={{ padding: "0 var(--space-3)" }}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: "flex-start" }}>
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </form>
      </section>

      {/* Appearance section */}
      <section className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)" }}>Appearance</h2>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          {(["light", "dark"] as const).map(t => (
            <div key={t} style={{ flex: 1 }}>
              <Tile
                selected={theme === t}
                onClick={() => handleTheme(t)}
                icon={t === "light" ? Sun : Moon}
                label={t.charAt(0).toUpperCase() + t.slice(1)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Account section */}
      <section className="card" style={{ padding: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)" }}>Account</h2>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
          Signed in as <strong>{user?.email}</strong>
        </p>
        <button className="btn btn-danger" onClick={() => setShowLogout(true)}><LogOut size={14} /> Sign Out</button>
      </section>

      {/* Logout Confirm */}
      <Modal
        open={showLogout}
        onClose={() => setShowLogout(false)}
        title="Sign Out"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowLogout(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => { logout(); window.location.href = "/login"; }}>
              Yes, Sign Out
            </button>
          </>
        }
      >
        <p style={{ fontSize: "var(--text-base)", color: "var(--color-text)" }}>
          Are you sure you want to sign out of Suraty?
        </p>
      </Modal>
    </div>
  );
}
