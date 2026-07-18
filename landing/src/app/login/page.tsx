"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0a 0%, #0f1117 50%, #0a0c12 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* Back to landing page link */}
      <a
        href="/"
        style={{
          position: "fixed",
          top: "24px",
          left: "32px",
          color: "#FFD700",
          textDecoration: "none",
          fontSize: "14px",
          fontWeight: 600,
          letterSpacing: "0.04em",
          opacity: 0.8,
          transition: "opacity 0.2s",
        }}
        onMouseOver={e => (e.currentTarget.style.opacity = "1")}
        onMouseOut={e => (e.currentTarget.style.opacity = "0.8")}
      >
        ← Back to Sentinel AI
      </a>

      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,215,0,0.15)",
        borderRadius: "16px",
        padding: "48px 40px",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,215,0,0.05)",
      }}>
        {/* Logo/Brand */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #FFD700, #FFA500)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: "28px",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}>
            Sentinel AI
          </div>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", margin: 0 }}>
            AML Investigation Platform
          </p>
        </div>

        <h1 style={{
          color: "#ffffff",
          fontSize: "22px",
          fontWeight: 700,
          marginBottom: "24px",
          textAlign: "center",
          margin: "0 0 28px 0",
        }}>
          Sign in to your account
        </h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: "13px", marginBottom: "6px", fontWeight: 500 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="analyst@example.com"
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(255,215,0,0.5)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
          </div>

          <div>
            <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: "13px", marginBottom: "6px", fontWeight: 500 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(255,215,0,0.5)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: "8px",
              padding: "10px 14px",
              color: "#fc8181",
              fontSize: "13px",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: "46px",
              background: loading ? "rgba(255,215,0,0.5)" : "#FFD700",
              color: "#0a0a0a",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "15px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "8px",
              transition: "filter 0.2s ease, box-shadow 0.2s ease",
              boxShadow: "0 2px 16px rgba(255,215,0,0.3)",
            }}
            onMouseOver={e => { if (!loading) e.currentTarget.style.filter = "brightness(1.1)"; }}
            onMouseOut={e => { e.currentTarget.style.filter = "brightness(1)"; }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{
          textAlign: "center",
          color: "rgba(255,255,255,0.3)",
          fontSize: "12px",
          marginTop: "24px",
          marginBottom: 0,
        }}>
          Built by <span style={{ color: "rgba(255,215,0,0.6)", fontWeight: 600 }}>TEAM SPIRIT</span> · Sentinel AI &copy; 2026
        </p>
      </div>
    </div>
  );
}
