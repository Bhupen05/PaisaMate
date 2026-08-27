"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  currency: z.string().length(3, "Currency code must be exactly 3 characters"),
});

type RegisterFields = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      currency: "INR",
    },
  });

  const onSubmit = async (data: RegisterFields) => {
    setLoading(true);
    setServerError(null);
    try {
      const res = await api.post("/auth/register", data);
      const { user, access_token, refresh_token } = res.data;
      setAuth(user, access_token, refresh_token);
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setServerError(
        err.response?.data?.detail || "Registration failed. Email might already be in use."
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
        maxWidth: "440px",
        padding: "var(--space-8)",
        borderRadius: "var(--radius-lg)",
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
            Create Account
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
            Join Suraty and start sharing expenses
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {serverError && (
            <div style={{
              backgroundColor: "var(--color-danger-bg)",
              color: "var(--color-danger)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-sm)",
              marginBottom: "var(--space-4)",
              border: "1px solid var(--color-danger)",
            }}>
              {serverError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              placeholder="Bhupen"
              className={`input ${errors.name ? "error" : ""}`}
              {...register("name")}
            />
            {errors.name && <span className="form-error">{errors.name.message}</span>}
          </div>

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

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className={`input ${errors.password ? "error" : ""}`}
              {...register("password")}
            />
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>

          <div className="form-group" style={{ marginBottom: "var(--space-6)" }}>
            <label className="form-label">Default Currency</label>
            <select
              className="input"
              style={{ padding: "0 var(--space-3)" }}
              {...register("currency")}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
            {errors.currency && <span className="form-error">{errors.currency.message}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginBottom: "var(--space-4)" }}
            disabled={loading}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ fontWeight: 600, textDecoration: "none" }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
