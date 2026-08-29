"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFields = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirectParam, setRedirectParam] = useState<string | null>(null);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("redirect");
    if (r && r.startsWith("/")) setRedirectParam(r);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFields) => {
    setLoading(true);
    setServerError(null);
    try {
      const res = await api.post("/auth/login", data);
      const { user, access_token, refresh_token } = res.data;
      setAuth(user, access_token, refresh_token);
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      router.push(redirect && redirect.startsWith("/") ? redirect : "/dashboard");
    } catch (err: any) {
      console.error(err);
      setServerError(
        err.response?.data?.detail || "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

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
        maxWidth: "420px",
        padding: "var(--space-8)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-lg)",
        backgroundColor: "var(--color-surface)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
          <h1 style={{
            fontSize: "var(--text-3xl)",
            fontWeight: 700,
            color: "var(--color-primary)",
            marginBottom: "var(--space-2)",
          }}>
            Welcome to Suraty
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
            Daily finance and shared expense tracking
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {serverError && (
            <ErrorBanner message={serverError} onDismiss={() => setServerError(null)} />
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              className={`input ${errors.email ? "error" : ""}`}
              {...register("email")}
            />
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          <div className="form-group" style={{ marginBottom: "var(--space-6)" }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className={`input ${errors.password ? "error" : ""}`}
              {...register("password")}
            />
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginBottom: "var(--space-4)" }}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
            Don't have an account?{" "}
            <Link href={redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : "/register"} style={{ fontWeight: 600, textDecoration: "none" }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
