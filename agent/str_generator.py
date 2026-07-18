"""
agent/str_generator.py — Draft STR (Suspicious Transaction Report) Generator
==============================================================================
Formats the agent's accumulated evidence into a structured draft STR
aligned with India's FIU-IND / RBI / PMLA format.

The STR is always framed as a DRAFT for human analyst review.
It is NOT court-admissible evidence.
"""

from datetime import datetime


def format_str(
    account_id: str,
    history_data: dict,
    graph_data: dict,
    risk_data: dict,
    regulations: list[dict],
    typologies: list[dict],
) -> str:
    """
    Assemble a draft STR from the collected evidence.

    Args:
        account_id:    The subject account.
        history_data:  Output of get_transaction_history tool (dict).
        graph_data:    Output of get_transaction_graph tool (dict).
        risk_data:     Output of score_risk tool (dict, optional — None if not called).
        regulations:   List of retrieved regulation passages [{text, source, page}].
        typologies:    List of typology dicts from detect_typology tool.

    Returns:
        Formatted STR string.
    """
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    summary = history_data.get("summary", {})
    profile = graph_data.get("graph_profile", {})

    # ── Risk tier from score_risk or fallback from history ─────────────────
    if risk_data:
        risk_tier = risk_data.get("risk_tier", "UNKNOWN")
        fraud_prob = risk_data.get("fraud_probability", 0)
        top_features = risk_data.get("top_features", [])
    else:
        risk_tier = "NOT SCORED"
        fraud_prob = None
        top_features = []

    # ── Typology summary ───────────────────────────────────────────────────
    typology_lines = []
    for t in typologies:
        typology_lines.append(
            f"  • [{t.get('risk', 'UNKNOWN')}] {t.get('type', '')}: {t.get('description', '')}"
        )
    typology_section = "\n".join(typology_lines) if typology_lines else "  • None detected"

    # ── Regulatory citations ───────────────────────────────────────────────
    citation_lines = []
    for i, reg in enumerate(regulations[:3], 1):
        citation_lines.append(
            f"  [{i}] {reg.get('source', 'Unknown')} (p.{reg.get('page', '?')}): "
            f"\"{reg.get('text', '')[:200].strip()}…\""
        )
    citation_section = "\n".join(citation_lines) if citation_lines else "  [No regulatory citations retrieved]"

    if typologies:
        basis_note = "  Basis: Citations support the detected behavioral typologies listed in Section D."
    elif risk_tier in ("CRITICAL", "HIGH"):
        _score_txt = f"{fraud_prob:.4f}" if fraud_prob is not None else "not scored"
        basis_note = f"  Basis: Citations support enhanced due diligence and transaction-monitoring obligations for high-risk accounts (XGBoost score = {_score_txt})."
    else:
        basis_note = "  Basis: General reference for compliance monitoring."

    # SHAP feature contributions
    # REAL SHAP values from XGBoost native pred_contribs=True (TreeExplainer-
    # equivalent): true per-feature log-odds contributions, bias term dropped.
    # predictor._get_shap_top_features falls back to a feature-importance proxy
    # ONLY if native SHAP fails, and in that case sets shap_value=None, which we
    # label honestly below (importance-proxy, not SHAP).
    feat_lines = []
    for f in top_features[:5]:
        sv = f.get('shap_value')
        if sv is None:
            val = f.get('contribution', 0) or 0
            label = 'importance-proxy'
        else:
            val = sv
            label = 'SHAP'
        feat_lines.append(
            f"  • {f.get('feature', '?')}: {label}={val:+.6f} ({f.get('direction', '')})"
        )
    feat_section = "\n".join(feat_lines) if feat_lines else "  • [Score not computed]"

    # ── STR body ──────────────────────────────────────────────────────────
    str_text = f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║            SENTINEL AI — DRAFT SUSPICIOUS TRANSACTION REPORT (STR)          ║
║                 [INTERNAL COMPLIANCE DRAFT — NOT COURT-ADMISSIBLE]          ║
╚══════════════════════════════════════════════════════════════════════════════╝

REPORT METADATA
───────────────────────────────────────────────────────────────────────────────
  Generated     : {now} (automated draft — requires human analyst review)
  Subject Acct  : {account_id}
  Risk Tier     : {risk_tier}
  Fraud Prob    : {f"{fraud_prob:.4f}" if fraud_prob is not None else "Not scored"}
  Filing Basis  : Prevention of Money Laundering Act, 2002 (PMLA)
                  RBI KYC/AML Master Direction 2016 (updated 2023)

SECTION A — ACCOUNT SUMMARY
───────────────────────────────────────────────────────────────────────────────
  Total Transactions   : {summary.get('total_transactions', 'N/A')}
  Transactions Sent    : {summary.get('transactions_sent', 'N/A')}
  Transactions Received: {summary.get('transactions_received', 'N/A')}
  Total Amount Sent    : {(summary.get('total_amount_sent') or 0):,.2f} (synthetic units)
  Total Amount Received: {(summary.get('total_amount_received') or 0):,.2f} (synthetic units)
  Avg Transaction      : {(summary.get('avg_amount') or 0):,.2f} (synthetic units)
  Max Transaction      : {(summary.get('max_amount') or 0):,.2f} (synthetic units)
  Period               : {(summary.get('date_range') or {}).get('earliest', '?')} -> {(summary.get('date_range') or {}).get('latest', '?')}
  Fraud-flagged Txns   : {summary.get('fraud_flagged_count', 0)}
  High-risk Txns       : {summary.get('high_risk_count', 0)}
  Dataset Note         : Transaction amounts are PaySim synthetic units (not INR).
                         Regulatory amount thresholds do not apply directly to this data.

SECTION B — GRAPH INTELLIGENCE
───────────────────────────────────────────────────────────────────────────────
  In-degree (incoming edges)   : {profile.get('in_degree', 'N/A')}
  Out-degree (outgoing edges)  : {profile.get('out_degree', 'N/A')}
  Net Flow (recv-sent)         : {(profile.get('net_flow') or 0):,.2f} (synthetic units)
  Max Fraud Prob on Node       : {profile.get('max_fraud_prob', 'N/A')}
  Mule Score                   : {(graph_data.get('mule_score') or 0):.4f}
  Is Suspected Mule            : {graph_data.get('is_suspected_mule', False)}
  In Circular Ring             : {graph_data.get('in_ring', False)}
  Ring IDs                     : {', '.join(graph_data.get('ring_ids', [])) or 'None'}
  Connected Accounts (sample)  : {', '.join(graph_data.get('connected_nodes', [])[:8])}

SECTION C — ML RISK SCORING (XGBoost + SHAP)
───────────────────────────────────────────────────────────────────────────────
  Risk Tier           : {risk_tier}
  Fraud Probability   : {f"{fraud_prob:.4f}" if fraud_prob is not None else "Not scored"}
  Decision Threshold  : 0.70 (above = BLOCK | 0.30–0.70 = FLAG)

  Metrics (rebalanced 1.84% test set): PR-AUC=0.72 | Precision@0.70=0.29 | Recall@0.70=0.81

  Top SHAP Feature Contributions (log-odds scale, TreeExplainer):
{feat_section}

SECTION D — AML TYPOLOGY ANALYSIS
───────────────────────────────────────────────────────────────────────────────
{typology_section}

SECTION E — REGULATORY BASIS (RAG Citations)
───────────────────────────────────────────────────────────────────────────────
{basis_note}
  The following passages from real regulatory documents support this report:

{citation_section}

SECTION F — INVESTIGATION RECOMMENDATION
───────────────────────────────────────────────────────────────────────────────
  {"[ESCALATE] Immediate review recommended" if risk_tier in ("CRITICAL", "HIGH") else "[REVIEW] Flag for scheduled analyst review"}

  Recommended Actions:
  1. Human compliance analyst to review and verify all findings in this draft.
  2. Cross-reference against KYC records and CIBIL score for subject account.
  3. If findings confirmed: consider filing STR with FIU-IND per Section 12 of PMLA, 2002
     (7 working days from date of suspicion).
  4. Escalate to account freeze review if mule score > 0.8 or circular ring confirmed.

  DISCLAIMER:
  This is an AI-generated DRAFT for internal compliance use only. It is NOT a filed
  STR, NOT legal advice, and NOT court-admissible evidence. All findings require
  independent verification by a certified compliance officer before any regulatory
  action is taken. Transaction data is synthetic (PaySim-derived); regulatory
  amount thresholds in Section D are pattern-based and must be validated against
  real currency amounts in production.

══════════════════════════════════════════════════════════════════════════════
                          END OF DRAFT STR
══════════════════════════════════════════════════════════════════════════════
"""
    return str_text.strip()
