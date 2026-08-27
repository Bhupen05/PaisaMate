"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [currency, setCurrency] = useState(user?.currency || "INR");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await api.patch("/auth/me", {
        name: name.trim(),
        currency,
      });

      updateUser({
        name: res.data.name,
        currency: res.data.currency,
      });

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to update profile settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "560px", margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile Settings</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: "4px" }}>
            Configure your personal profile and currency display preferences.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: "var(--space-6)" }}>
        <form onSubmit={handleSave}>
          {success && (
            <div style={{
              backgroundColor: "var(--color-success-bg)",
              color: "var(--color-success)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-sm)",
              marginBottom: "var(--space-4)",
              border: "1px solid var(--color-success)",
            }}>
              Settings saved successfully!
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: "var(--color-danger-bg)",
              color: "var(--color-danger)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-sm)",
              marginBottom: "var(--space-4)",
              border: "1px solid var(--color-danger)",
            }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              disabled
              className="input"
              value={user?.email || ""}
              style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-muted)", cursor: "not-allowed" }}
            />
            <span style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "2px" }}>
              Your email address is unique and cannot be changed.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              required
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "var(--space-6)" }}>
            <label className="form-label">Default Currency</label>
            <select
              className="input"
              style={{ padding: "0 var(--space-3)" }}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
            <span style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "2px" }}>
              This defines your primary currency display.
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Saving Settings..." : "Save Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
