"""
agent/guardrails.py — Citation Enforcement + Evidence Threshold
================================================================
Validates that a draft STR meets minimum evidence standards before
it is returned to the console or API caller.

Rules:
  G1. Minimum tool calls: agent must have called >= 3 tools.
  G2. Regulatory citation: at least 1 regulatory passage must be retrieved.
  G3. Risk score: score_risk must have been called (fraud_probability present).
  G4. Hallucination check: known regulatory names not mentioned in retrieved
      passages are flagged (heuristic — not a guarantee).
"""

import json
import logging
import re

logger = logging.getLogger(__name__)

# Regulatory names that require RAG citation backing.
# Only check regulators whose documents are actually in the corpus.
# Corpus: FATF, RBI (via legislative ref whitelist), FinCEN, MHA
# SEBI is NOT in the corpus — removed to avoid false-positive G4 warnings.
_MUST_CITE_REGULATORS = {
    "FATF": ["fatf", "financial action task force"],
    "FinCEN": ["fincen", "financial crimes enforcement"],
}

# Legislative framework references — appear in STR boilerplate (Filing Basis,
# Disclaimer) as standard legal citations, not agent-generated factual claims.
# PMLA, RBI, FIU-IND are Indian law — always valid in this compliance context.
# G4 does NOT flag these.
_LEGISLATIVE_REFS = {"PMLA", "RBI", "FIU-IND"}


def check_hallucination(str_text: str, citations: list[dict]) -> list[str]:
    """
    Check if the STR makes unsubstantiated regulatory claims.

    Only checks _MUST_CITE_REGULATORS (FATF, FinCEN).
    _LEGISLATIVE_REFS (PMLA, RBI, FIU-IND) are whitelisted because they appear
    in the STR template as statutory filing-basis references, not as claims
    requiring RAG evidence.

    Returns a list of warning strings (empty = no issues).
    """
    citation_corpus = " ".join(
        c.get("text", "") + " " + c.get("source", "") for c in citations
    ).lower()

    warnings = []
    for regulator, aliases in _MUST_CITE_REGULATORS.items():
        mentioned = any(alias in str_text.lower() for alias in aliases)
        backed = any(alias in citation_corpus for alias in aliases)
        if mentioned and not backed and citations:
            warnings.append(
                f"G4: '{regulator}' mentioned in STR but not found in retrieved citations. "
                "Verify this claim manually."
            )
    return warnings



class GuardrailsResult:
    """Result object from validate_str_draft()."""

    def __init__(self):
        self.passed = True
        self.violations: list[str] = []
        self.warnings: list[str] = []

    def add_violation(self, msg: str):
        self.passed = False
        self.violations.append(msg)

    def add_warning(self, msg: str):
        self.warnings.append(msg)

    def summary(self) -> str:
        status = "✅ PASSED" if self.passed else "❌ FAILED"
        lines = [f"Guardrails {status}"]
        if self.violations:
            lines.append("Violations:")
            for v in self.violations:
                lines.append(f"  • {v}")
        if self.warnings:
            lines.append("Warnings:")
            for w in self.warnings:
                lines.append(f"  ⚠️ {w}")
        return "\n".join(lines)


def validate_str_draft(
    str_text: str,
    tool_call_count: int,
    citations: list[dict],
    fraud_probability: float | None,
    evidence_threshold: float = 0.6,
) -> GuardrailsResult:
    """
    Validate the draft STR against all guardrail rules.

    Args:
        str_text:          The raw STR text.
        tool_call_count:   Number of agent tool calls made (from agent trace).
        citations:         Retrieved regulatory passages.
        fraud_probability: The score_risk output (None if not called).
        evidence_threshold: Minimum risk score to allow STR generation (default 0.6).

    Returns:
        GuardrailsResult with pass/fail and any violations/warnings.
    """
    result = GuardrailsResult()

    # G1 — Minimum tool calls
    if tool_call_count < 3:
        result.add_violation(
            f"G1: Only {tool_call_count} tool call(s) made. Minimum 3 required before "
            "STR generation to ensure sufficient evidence."
        )

    # G2 — At least 1 regulatory citation
    if not citations:
        result.add_violation(
            "G2: No regulatory citations retrieved. search_regulations must be called "
            "before STR generation. All regulatory claims must be cited."
        )

    # G3 — Risk score must be present
    if fraud_probability is None:
        result.add_violation(
            "G3: score_risk was not called. Risk probability is required in the STR."
        )
    elif fraud_probability < evidence_threshold:
        result.add_warning(
            f"G3: fraud_probability={fraud_probability:.3f} is below evidence_threshold="
            f"{evidence_threshold}. Consider whether this account truly warrants an STR."
        )

    # G4 — Hallucination check
    hallucination_warnings = check_hallucination(str_text, citations)
    for w in hallucination_warnings:
        result.add_warning(w)

    logger.info("Guardrails: %s", result.summary())
    return result
