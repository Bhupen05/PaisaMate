"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Handshake, CheckCircle2, AlertTriangle, LogOut } from "lucide-react";

interface InviteInfo {
  friend_name: string;
  friend_email: string;
  inviter_name: string;
  status: "PENDING" | "ACTIVE" | "ARCHIVED";
}

interface AcceptResult {
  friend_name: string;
  inviter_name: string;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in" style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      backgroundColor: "var(--color-bg)",
      padding: "var(--space-4)",
    }}>
      <div className="card" style={{
        width: "100%",
        maxWidth: "440px",
        padding: "var(--space-8)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-lg)",
        backgroundColor: "var(--color-surface)",
        textAlign: "center",
      }}>
        {children}
      </div>
    </div>
  );
}

export default function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [accepted, setAccepted] = useState<AcceptResult | null>(null);
  const { user, isAuthenticated, hasHydrated, logout } = useAuthStore();

  const inviteQuery = useQuery({
    queryKey: ["invite", token],
    queryFn: async () => (await api.get<InviteInfo>(`/friends/invite/${token}`)).data,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => (await api.post<AcceptResult>(`/friends/invite/${token}/accept`)).data,
    onSuccess: (data) => setAccepted(data),
  });

  if (inviteQuery.isPending || !hasHydrated) {
    return (
      <Shell>
        <LoadingSpinner centered />
      </Shell>
    );
  }

  if (inviteQuery.isError) {
    return (
      <Shell>
        <AlertTriangle size={40} color="var(--color-danger)" style={{ marginBottom: "var(--space-3)" }} />
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>Invite link not valid</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-6)" }}>
          This link may have expired, already been cancelled, or been typed incorrectly.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ textDecoration: "none" }}>Go to Suraty</Link>
      </Shell>
    );
  }

  const info = inviteQuery.data!;
  const redirectHref = `/invite/${token}`;

  if (accepted || info.status !== "PENDING") {
    const names = accepted ?? info;
    return (
      <Shell>
        <CheckCircle2 size={40} color="var(--color-success)" style={{ marginBottom: "var(--space-3)" }} />
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
          {accepted ? "You're in!" : "Already accepted"}
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-6)", lineHeight: 1.6 }}>
          {names.inviter_name} can now split expenses and settle up with you on Suraty.
        </p>
        <Link href="/dashboard" className="btn btn-primary" style={{ textDecoration: "none" }}>Go to Dashboard</Link>
      </Shell>
    );
  }

  // Not logged in — the invite can only be accepted by the account it was
  // addressed to, so send them to log in / sign up and bounce back here.
  if (!isAuthenticated) {
    return (
      <Shell>
        <Handshake size={40} color="var(--color-accent)" style={{ marginBottom: "var(--space-3)" }} />
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
          {info.inviter_name} invited you to Suraty
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-6)", lineHeight: 1.6 }}>
          Log in or create a Suraty account as <strong>{info.friend_email}</strong> to accept and start splitting expenses with {info.inviter_name}.
        </p>
        <Link href={`/login?redirect=${encodeURIComponent(redirectHref)}`} className="btn btn-primary" style={{ width: "100%", textDecoration: "none", marginBottom: "var(--space-3)" }}>
          Log In to Accept
        </Link>
        <Link href={`/register?redirect=${encodeURIComponent(redirectHref)}`} className="btn btn-secondary" style={{ width: "100%", textDecoration: "none" }}>
          Create Account
        </Link>
      </Shell>
    );
  }

  // Logged in as the wrong account — accepting would 403, so head that off.
  if (user && user.email !== info.friend_email) {
    return (
      <Shell>
        <AlertTriangle size={40} color="var(--color-warning)" style={{ marginBottom: "var(--space-3)" }} />
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>Wrong account</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-6)", lineHeight: 1.6 }}>
          This invite is for <strong>{info.friend_email}</strong>, but you're logged in as <strong>{user.email}</strong>.
        </p>
        <button
          className="btn btn-primary"
          style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}
          onClick={() => {
            logout();
            window.location.href = `/login?redirect=${encodeURIComponent(redirectHref)}`;
          }}
        ><LogOut size={14} /> Log Out & Switch Account</button>
      </Shell>
    );
  }

  return (
    <Shell>
      <Handshake size={40} color="var(--color-accent)" style={{ marginBottom: "var(--space-3)" }} />
      <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
        {info.inviter_name} invited you to Suraty
      </h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-6)", lineHeight: 1.6 }}>
        Accept to let {info.inviter_name} track shared expenses and settle up with you as <strong>{info.friend_name}</strong>.
      </p>

      {acceptMutation.isError && (
        <p style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
          {(acceptMutation.error as any)?.response?.data?.detail || "Unable to accept this invite. Please try again."}
        </p>
      )}

      <button
        className="btn btn-primary"
        style={{ width: "100%" }}
        onClick={() => acceptMutation.mutate()}
        disabled={acceptMutation.isPending}
      >
        {acceptMutation.isPending ? "Accepting…" : "Accept Invite"}
      </button>
    </Shell>
  );
}
