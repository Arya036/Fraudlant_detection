"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#FFD700",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        fontSize: "16px",
        letterSpacing: "0.04em",
      }}>
        Loading Sentinel AI...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0a 0%, #0f1117 100%)",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: "#ffffff",
    }}>
      {/* Top navbar */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 40px",
        height: "64px",
        background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,215,0,0.12)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          background: "linear-gradient(135deg, #FFD700, #FFA500)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: "20px",
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>
          Sentinel AI
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
            {user?.email} · <span style={{ color: "#FFD700", fontWeight: 600, textTransform: "capitalize" }}>{user?.role}</span>
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 20px",
              background: "transparent",
              border: "1px solid rgba(255,215,0,0.4)",
              borderRadius: "6px",
              color: "#FFD700",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              transition: "all 0.2s ease",
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = "rgba(255,215,0,0.12)";
              e.currentTarget.style.borderColor = "#FFD700";
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,215,0,0.4)";
            }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main content area */}
      <main style={{ padding: "60px 40px" }}>
        <h1 style={{
          fontSize: "32px",
          fontWeight: 800,
          marginBottom: "8px",
          background: "linear-gradient(135deg, #FFD700, #FFA500)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          Investigation Console
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "15px", marginBottom: "48px" }}>
          Welcome back{user?.name ? `, ${user.name}` : ""}. Select a module below to begin your AML investigation.
        </p>

        {/* Module cards — wire up to your Streamlit/FastAPI console later */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
          {[
            {
              title: "Fraud Network Graph",
              desc: "Analyse transaction flows, detect mule networks and ring/chain patterns using the FundFlow graph engine.",
              status: "Ready",
              href: "/console",
            },
            {
              title: "Agentic STR Investigator",
              desc: "Submit a flagged account ID and let the LangGraph agent autonomously draft a cited Suspicious Transaction Report.",
              status: "Ready",
              href: "/console",
            },
            {
              title: "Digital Arrest Classifier",
              desc: "Paste a call transcript and classify likely digital-arrest / fake-officer / KYC-freeze scam patterns.",
              status: "Coming Soon",
              href: null,
            },
          ].map(card => (
            <div key={card.title} style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,215,0,0.12)",
              borderRadius: "12px",
              padding: "28px 24px",
              backdropFilter: "blur(8px)",
              transition: "border-color 0.2s, box-shadow 0.2s",
              cursor: card.status === "Ready" ? "pointer" : "default",
            }}
              onClick={() => { if (card.href) window.location.href = card.href; }}
              onMouseOver={e => {
                if (card.status === "Ready") {
                  e.currentTarget.style.borderColor = "rgba(255,215,0,0.4)";
                  e.currentTarget.style.boxShadow = "0 4px 24px rgba(255,215,0,0.1)";
                }
              }}
              onMouseOut={e => {
                e.currentTarget.style.borderColor = "rgba(255,215,0,0.12)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", margin: 0 }}>{card.title}</h3>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "99px",
                  background: card.status === "Ready" ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.06)",
                  color: card.status === "Ready" ? "#FFD700" : "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  whiteSpace: "nowrap",
                  marginLeft: "8px",
                }}>
                  {card.status}
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", lineHeight: "1.6", margin: 0 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
