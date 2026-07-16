"""
console/app.py — Sentinel AI Investigation Console (Streamlit)
================================================================
A 4-tab investigation console:

  Tab 1: 🔍 Investigate  — Submit account ID → agent runs → draft STR
  Tab 2: 📊 Graph View   — Transaction network visualization (Plotly)
  Tab 3: 📚 RAG Lookup   — Direct regulatory corpus search
  Tab 4: 📋 Alerts       — Database alert browser

Run with:
  streamlit run console/app.py
"""

import sys
import os
import json
import sqlite3
import logging

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Path setup ─────────────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

DB_PATH = os.environ.get("PS6_DB_PATH", os.path.join(ROOT, "fundflow.db"))

logging.basicConfig(level=logging.WARNING)

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Sentinel AI — AML Investigation Console",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ─────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=JetBrains+Mono:wght@400;700&display=swap');

    :root {
        --bg-primary: #0a0e1a;
        --bg-card: #111827;
        --bg-surface: #1f2937;
        --accent-blue: #3b82f6;
        --accent-cyan: #06b6d4;
        --accent-purple: #8b5cf6;
        --accent-red: #ef4444;
        --accent-amber: #f59e0b;
        --accent-green: #10b981;
        --text-primary: #f9fafb;
        --text-secondary: #9ca3af;
        --border: #374151;
    }

    .stApp { background: var(--bg-primary); font-family: 'Inter', sans-serif; }

    .sentinel-header {
        background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #1a2744 100%);
        border: 1px solid #4c1d95;
        border-radius: 12px;
        padding: 24px 32px;
        margin-bottom: 24px;
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .sentinel-title {
        font-size: 28px;
        font-weight: 700;
        color: #e0e7ff;
        letter-spacing: -0.5px;
        margin: 0;
    }

    .sentinel-subtitle {
        font-size: 13px;
        color: #a5b4fc;
        margin: 4px 0 0 0;
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }

    .risk-badge-critical {
        background: linear-gradient(135deg, #7f1d1d, #ef4444);
        color: white; padding: 6px 16px; border-radius: 20px;
        font-weight: 700; font-size: 12px; display: inline-block;
        animation: pulse 2s infinite;
    }
    .risk-badge-high {
        background: linear-gradient(135deg, #92400e, #f59e0b);
        color: #1f2937; padding: 6px 16px; border-radius: 20px;
        font-weight: 700; font-size: 12px; display: inline-block;
    }
    .risk-badge-medium {
        background: linear-gradient(135deg, #1e3a5f, #3b82f6);
        color: white; padding: 6px 16px; border-radius: 20px;
        font-weight: 700; font-size: 12px; display: inline-block;
    }
    .risk-badge-low {
        background: linear-gradient(135deg, #064e3b, #10b981);
        color: white; padding: 6px 16px; border-radius: 20px;
        font-weight: 700; font-size: 12px; display: inline-block;
    }

    .str-output {
        background: #0d1117;
        border: 1px solid #30363d;
        border-radius: 8px;
        padding: 20px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: #e6edf3;
        white-space: pre-wrap;
        line-height: 1.6;
        max-height: 600px;
        overflow-y: auto;
    }

    .tool-step {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        background: var(--bg-surface);
        border-radius: 8px;
        margin: 4px 0;
        border-left: 3px solid var(--accent-cyan);
        font-size: 13px;
        color: var(--text-primary);
    }

    .guardrail-pass {
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid #10b981;
        border-radius: 8px;
        padding: 12px 16px;
        color: #6ee7b7;
        font-size: 13px;
    }
    .guardrail-fail {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid #ef4444;
        border-radius: 8px;
        padding: 12px 16px;
        color: #fca5a5;
        font-size: 13px;
    }

    .metric-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 16px 20px;
        text-align: center;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }

    /* Sidebar */
    section[data-testid="stSidebar"] {
        background: #0d1117 !important;
        border-right: 1px solid #30363d;
    }

    /* Buttons */
    .stButton > button {
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        padding: 10px 24px;
        transition: all 0.2s;
    }
    .stButton > button:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(79, 70, 229, 0.4);
    }

    /* Text inputs */
    .stTextInput > div > div > input {
        background: var(--bg-surface) !important;
        border: 1px solid var(--border) !important;
        color: var(--text-primary) !important;
        border-radius: 8px !important;
        font-family: 'JetBrains Mono', monospace !important;
    }
</style>
""", unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="sentinel-header">
    <div style="font-size:40px">🛡️</div>
    <div>
        <p class="sentinel-title">SENTINEL AI</p>
        <p class="sentinel-subtitle">AML Investigation Console &nbsp;|&nbsp; Fraud Network Intelligence</p>
    </div>
    <div style="margin-left:auto; text-align:right">
        <span style="background:#1e3a5f; color:#93c5fd; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:600">
            HACKATHON MVP
        </span>
        <br><span style="color:#6b7280; font-size:11px; margin-top:4px; display:block">
            PS6 — AI for Digital Public Safety
        </span>
    </div>
</div>
""", unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# SIDEBAR
# ─────────────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### Quick Stats")
    st.caption("Synthetic PaySim dataset (India-mapped). Amounts are in synthetic units, not INR.")
    try:
        conn = sqlite3.connect(DB_PATH)
        txn_count = pd.read_sql_query("SELECT COUNT(*) as c FROM transactions", conn).iloc[0]["c"]
        fraud_count = pd.read_sql_query("SELECT COUNT(*) as c FROM transactions WHERE is_fraud=1", conn).iloc[0]["c"]
        alert_count = pd.read_sql_query("SELECT COUNT(*) as c FROM alerts", conn).iloc[0]["c"]
        conn.close()

        col1, col2 = st.columns(2)
        with col1:
            st.metric("Transactions", f"{txn_count:,}")
            st.metric("Alerts", alert_count)
        with col2:
            st.metric("Fraud-labeled", f"{fraud_count:,}")
            fraud_rate = round(fraud_count / txn_count * 100, 2) if txn_count > 0 else 0
            st.metric("Fraud Rate", f"{fraud_rate}%")

        st.caption(
            f"Note: {fraud_rate}% fraud rate reflects FundFlow's rebalanced/augmented "
            "PaySim set (not raw PaySim's ~0.13%). Disclosed in demo context."
        )
    except Exception as e:
        st.error(f"DB Error: {e}")

    st.divider()
    st.markdown("### Demo Accounts")
    st.caption("All accounts below are CRITICAL tier (fraud_prob=1.0, multiple flagged txns)")
    st.markdown("""
- `C1953680528` — 16 txns, all fraud-flagged
- `C658156224`  — 15 txns, all fraud-flagged
- `C832102131`  — 14 txns, prob=0.999
- `C111612613`  — 13 txns, all fraud-flagged
""")

    st.divider()
    st.markdown("### Platform Info")
    st.markdown("""
**Model**: XGBoost (PaySim synthetic data)
**Agent**: LangGraph ReAct — LLM selects tools
**RAG**: Chroma + all-MiniLM-L6-v2 (local)
**Data**: Synthetic (PaySim) | Regulations: Real
""")
    st.caption("All outputs are internal draft STRs for human analyst review. Not court-admissible evidence.")


# ─────────────────────────────────────────────────────────────────────────────
# TABS
# ─────────────────────────────────────────────────────────────────────────────
tab1, tab2, tab3, tab4 = st.tabs([
    "🔍 Investigate",
    "📊 Graph View",
    "📚 RAG Lookup",
    "📋 Alerts",
])


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1 — INVESTIGATE
# ═══════════════════════════════════════════════════════════════════════════════
with tab1:
    st.markdown("#### Submit Account for AML Investigation")
    st.caption("The agent will autonomously call 5 tools and produce a cited draft STR.")

    col_input, col_btn = st.columns([3, 1])
    with col_input:
        account_id = st.text_input(
            "Account ID",
            placeholder="e.g. C1828508781",
            key="account_input",
            label_visibility="collapsed",
        )
    with col_btn:
        investigate_btn = st.button("🔍 Investigate", use_container_width=True)

    if investigate_btn and account_id:
        with st.spinner(f"🤖 Agent investigating {account_id}…"):
            try:
                from agent.orchestrator import run_investigation
                result = run_investigation(account_id.strip())

                # ── Tool call trace ───────────────────────────────────────
                st.markdown("#### 🔧 Agent Tool Calls")
                tool_icons = {
                    "get_transaction_history": "📋",
                    "get_transaction_graph": "🕸️",
                    "score_risk": "⚡",
                    "search_regulations": "📚",
                    "detect_typology": "🔬",
                }
                for i, tool in enumerate(result["tool_trace"], 1):
                    icon = tool_icons.get(tool, "🔧")
                    st.markdown(
                        f'<div class="tool-step">{icon} Step {i}: <b>{tool}</b></div>',
                        unsafe_allow_html=True,
                    )

                # ── Guardrails ────────────────────────────────────────────
                g = result["guardrails"]
                css_class = "guardrail-pass" if g["passed"] else "guardrail-fail"
                icon = "✅" if g["passed"] else "❌"
                violations_html = "".join(f"<br>• {v}" for v in g["violations"])
                warnings_html = "".join(f"<br>⚠️ {w}" for w in g["warnings"])
                st.markdown(
                    f'<div class="{css_class}">{icon} <b>Guardrails {("PASSED" if g["passed"] else "FAILED")}</b>'
                    f"{violations_html}{warnings_html}</div>",
                    unsafe_allow_html=True,
                )

                # ── Draft STR ─────────────────────────────────────────────
                st.markdown("#### 📄 Draft Suspicious Transaction Report")
                st.markdown(
                    f'<div class="str-output">{result["str_draft"]}</div>',
                    unsafe_allow_html=True,
                )

                # Download button
                st.download_button(
                    label="⬇️ Download Draft STR (.txt)",
                    data=result["str_draft"],
                    file_name=f"draft_STR_{account_id}.txt",
                    mime="text/plain",
                )

            except Exception as e:
                st.error(f"Investigation failed: {e}")
                st.exception(e)

    elif investigate_btn:
        st.warning("Please enter an account ID.")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2 — GRAPH VIEW
# ═══════════════════════════════════════════════════════════════════════════════
with tab2:
    st.markdown("#### Transaction Network Graph")
    st.caption("Visualize fund flows and connected accounts for a given account.")

    graph_account = st.text_input("Account ID for graph", placeholder="e.g. C1828508781", key="graph_account")
    max_hops = st.slider("Max hops", 1, 6, 3)
    graph_btn = st.button("🕸️ Build Graph", key="graph_btn")

    if graph_btn and graph_account:
        with st.spinner("Building transaction graph..."):
            try:
                from agent.tools import _build_account_ego_graph
                ffg, df = _build_account_ego_graph(graph_account.strip())

                if ffg is None:
                    st.warning("No transactions found for this account in the database.")
                else:
                    flow = ffg.trace_fund_flow(graph_account.strip(), max_hops=max_hops)

                    nodes = flow.get("nodes", [])
                    edges = flow.get("edges", [])

                    if not nodes:
                        st.warning("Account found but no connected fund flows detected.")
                    else:
                        import networkx as nx

                        G_sub = nx.DiGraph()
                        for node in nodes:
                            G_sub.add_node(node)
                        for edge in edges:
                            G_sub.add_edge(edge["from"], edge["to"], weight=edge.get("amount", 0))

                        pos = nx.spring_layout(G_sub, seed=42)

                        edge_x, edge_y = [], []
                        for u, v in G_sub.edges():
                            x0, y0 = pos[u]; x1, y1 = pos[v]
                            edge_x += [x0, x1, None]; edge_y += [y0, y1, None]

                        node_x = [pos[n][0] for n in G_sub.nodes()]
                        node_y = [pos[n][1] for n in G_sub.nodes()]
                        node_labels = list(G_sub.nodes())
                        node_colors = ["#ef4444" if n == graph_account else "#3b82f6" for n in G_sub.nodes()]

                        fig = go.Figure()
                        fig.add_trace(go.Scatter(
                            x=edge_x, y=edge_y, mode="lines",
                            line=dict(width=1, color="#374151"), hoverinfo="none",
                        ))
                        fig.add_trace(go.Scatter(
                            x=node_x, y=node_y, mode="markers+text",
                            marker=dict(size=12, color=node_colors, line=dict(width=1, color="#111827")),
                            text=[n[:10] for n in node_labels],
                            textposition="top center",
                            textfont=dict(size=9, color="#9ca3af"),
                            hovertext=node_labels, hoverinfo="text",
                        ))
                        fig.update_layout(
                            paper_bgcolor="#0a0e1a", plot_bgcolor="#0a0e1a",
                            showlegend=False, margin=dict(l=0, r=0, t=20, b=0), height=500,
                            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                        )
                        st.plotly_chart(fig, use_container_width=True)

                        col1, col2, col3 = st.columns(3)
                        col1.metric("Connected Accounts", len(nodes))
                        col2.metric("Transactions (edges)", len(edges))
                        fraud_edges = sum(1 for e in edges if e.get("fraud_prob", 0) > 0.5)
                        col3.metric("High-Risk Edges", fraud_edges)

            except Exception as e:
                st.error(f"Graph error: {e}")
                st.exception(e)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3 — RAG LOOKUP
# ═══════════════════════════════════════════════════════════════════════════════
with tab3:
    st.markdown("#### Regulatory Corpus Search")
    st.caption("Search FATF / FinCEN / RBI guidance directly. Powered by Chroma + all-MiniLM-L6-v2.")

    rag_query = st.text_input(
        "Search query",
        placeholder="e.g. structuring PMLA threshold suspicious transaction",
        key="rag_query",
    )
    top_k = st.slider("Passages to retrieve", 1, 5, 3, key="rag_topk")
    rag_btn = st.button("📚 Search Regulations", key="rag_btn")

    if rag_btn and rag_query:
        try:
            from rag.retriever import retrieve_regulations
            results = retrieve_regulations(rag_query, top_k=top_k)

            for r in results["results"]:
                with st.expander(f"[{r['rank']}] {r['source']} — Page {r['page']}", expanded=True):
                    st.markdown(f"**Similarity distance:** `{r['distance']}`")
                    st.markdown(r["text"])
        except Exception as e:
            st.error(f"RAG lookup failed: {e}")
            st.info("Make sure to run `python rag/ingest.py` first to build the vector store.")

    elif rag_btn:
        st.warning("Please enter a search query.")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4 — ALERTS
# ═══════════════════════════════════════════════════════════════════════════════
with tab4:
    st.markdown("#### Database Alert Browser")
    st.caption("Recent alerts from the FundFlow database.")

    try:
        conn = sqlite3.connect(DB_PATH)
        alerts_df = pd.read_sql_query(
            "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 50", conn
        )
        conn.close()

        if alerts_df.empty:
            st.info("No alerts in database.")
        else:
            # Severity color mapping
            severity_colors = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢"}

            filter_severity = st.multiselect(
                "Filter by severity",
                options=alerts_df["severity"].unique().tolist(),
                default=alerts_df["severity"].unique().tolist(),
            )

            filtered = alerts_df[alerts_df["severity"].isin(filter_severity)]

            for _, row in filtered.iterrows():
                icon = severity_colors.get(row["severity"], "⚪")
                with st.expander(f"{icon} {row['alert_id']} — {row['severity']} — {row['timestamp'][:16]}"):
                    col1, col2 = st.columns(2)
                    with col1:
                        st.markdown(f"**Type:** {row['alert_type']}")
                        st.markdown(f"**Amount:** ₹{float(row.get('total_amount', 0)):,.2f}")
                        st.markdown(f"**Risk Score:** {row.get('risk_score', 'N/A')}")
                    with col2:
                        st.markdown(f"**Status:** {row.get('status', 'N/A')}")
                        accounts = json.loads(row.get("accounts_involved", "[]"))
                        st.markdown(f"**Accounts:** {', '.join(accounts)}")
                    st.markdown(f"**Description:** {row.get('description', '')}")
    except Exception as e:
        st.error(f"Alert browser error: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Footer
# ─────────────────────────────────────────────────────────────────────────────
st.divider()
st.markdown(
    "<p style='text-align:center; color:#4b5563; font-size:11px;'>"
    "Sentinel AI — PS6 Hackathon Submission | AI for Digital Public Safety | "
    "All STR outputs are internal compliance drafts — not court-admissible evidence."
    "</p>",
    unsafe_allow_html=True,
)
