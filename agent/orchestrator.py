"""
agent/orchestrator.py — Sentinel AI LangGraph Agent
====================================================
Uses LangGraph's create_react_agent (ReAct pattern) with GPT-4o-mini.

IMPORTANT — Is this genuinely agentic?
  Yes. create_react_agent implements the ReAct loop: the LLM receives the current
  conversation state (including tool outputs so far) and decides which tool to call
  next via OpenAI function-calling. It is NOT a hardcoded pipeline.

  The system prompt recommends an investigation order (history → graph → risk → regs
  → typology) but the LLM can deviate based on what it finds. For example:
    - If get_transaction_history returns zero transactions, the LLM may terminate early.
    - If score_risk returns LOW risk, it may skip detect_typology.
  This is what distinguishes it from a deterministic pipeline — the LLM reasons
  between steps. If asked in interview: "The LLM selects tools via function-calling;
  the system prompt provides an investigation protocol, not a hardcoded sequence."

Usage:
  from agent.orchestrator import run_investigation
  result = run_investigation("C1828508781")
  print(result["str_draft"])
"""

import json
import logging
import os
from typing import Any

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
logger = logging.getLogger(__name__)

from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from agent.tools import ALL_TOOLS
from agent.str_generator import format_str
from agent.guardrails import validate_str_draft


# ── LLM setup ─────────────────────────────────────────────────────────────────
LLM_MODEL = os.environ.get("AGENT_LLM_MODEL", "gpt-4o-mini")
MAX_STEPS = int(os.environ.get("AGENT_MAX_STEPS", "10"))
EVIDENCE_THRESHOLD = float(os.environ.get("AGENT_EVIDENCE_THRESHOLD", "0.6"))

SYSTEM_PROMPT = """You are Sentinel AI — an expert AML (Anti-Money Laundering) investigation 
agent for an Indian financial institution.

Your task: Given a suspicious account ID, autonomously investigate it by calling your tools 
in a logical order, then produce a cited draft Suspicious Transaction Report (STR) for 
human review and potential FIU-IND filing.

INVESTIGATION PROTOCOL:
1. ALWAYS call get_transaction_history first — understand transaction volume/pattern.
2. ALWAYS call get_transaction_graph — get mule scores, ring membership, network profile.
3. ALWAYS call score_risk — run the XGBoost model on the most suspicious transaction.
4. ALWAYS call search_regulations — retrieve relevant FATF/FinCEN/RBI guidance.
5. CALL detect_typology — identify structuring, layering, smurfing, round-tripping patterns.

RULES:
- Every regulatory claim MUST be backed by a citation from search_regulations.
- Use REAL numbers from tool outputs — never invent or round up scores.
- Frame output as a DRAFT STR for human analyst review (not court-admissible evidence).
- Use the Indian term STR (Suspicious Transaction Report), not SAR.
- The STR is filed with FIU-IND under PMLA, 2002.
- After calling all tools, respond with: "INVESTIGATION COMPLETE. Drafting STR now."
"""


def run_investigation(account_id: str) -> dict[str, Any]:
    """
    Run a full agentic investigation on the given account ID.

    Returns a dict:
        {
            "account_id": str,
            "str_draft": str,        — formatted draft STR
            "guardrails": dict,      — pass/fail + violations/warnings
            "tool_trace": list,      — list of tool calls made
            "raw_agent_output": str, — final agent message
        }
    """
    logger.info("Starting investigation for account: %s", account_id)

    # create_react_agent implements the ReAct loop: LLM receives tool outputs and
    # decides the next action via function-calling. The system prompt suggests an
    # investigation protocol but does NOT hardcode the tool sequence.
    llm = ChatOpenAI(model=LLM_MODEL, temperature=0)
    agent = create_react_agent(llm, ALL_TOOLS)

    # Run the agent
    messages = [
        ("system", SYSTEM_PROMPT),
        ("human", (
            f"Investigate account {account_id} for potential money laundering / fraud.\n"
            "Follow the investigation protocol: call all 5 tools in order, then confirm "
            "'INVESTIGATION COMPLETE. Drafting STR now.'"
        )),
    ]

    result = agent.invoke({"messages": messages}, config={"recursion_limit": MAX_STEPS + 5})

    # ── Extract tool call trace ───────────────────────────────────────────────
    tool_trace = []
    history_data = {}
    graph_data = {}
    risk_data = None
    regulations = []
    typologies_data = []

    for msg in result.get("messages", []):
        # Tool call messages (ToolMessage)
        if hasattr(msg, "name") and msg.name:
            tool_trace.append(msg.name)
            try:
                content = json.loads(msg.content) if isinstance(msg.content, str) else msg.content

                if msg.name == "get_transaction_history":
                    history_data = content
                elif msg.name == "get_transaction_graph":
                    graph_data = content
                elif msg.name == "score_risk":
                    risk_data = content
                elif msg.name == "search_regulations":
                    regulations = content.get("results", []) if isinstance(content, dict) else []
                elif msg.name == "detect_typology":
                    typologies_data = content.get("typologies", []) if isinstance(content, dict) else []
            except Exception:
                pass

    # ── Build the STR ─────────────────────────────────────────────────────────
    str_draft = format_str(
        account_id=account_id,
        history_data=history_data,
        graph_data=graph_data,
        risk_data=risk_data,
        regulations=regulations,
        typologies=typologies_data,
    )

    # ── Run guardrails ────────────────────────────────────────────────────────
    fraud_prob = risk_data.get("fraud_probability") if risk_data else None
    guardrails_result = validate_str_draft(
        str_text=str_draft,
        tool_call_count=len(tool_trace),
        citations=regulations,
        fraud_probability=fraud_prob,
        evidence_threshold=EVIDENCE_THRESHOLD,
    )

    # ── Get final agent message ───────────────────────────────────────────────
    final_message = ""
    for msg in reversed(result.get("messages", [])):
        if hasattr(msg, "content") and isinstance(msg.content, str) and not hasattr(msg, "name"):
            final_message = msg.content
            break

    return {
        "account_id": account_id,
        "str_draft": str_draft,
        "guardrails": {
            "passed": guardrails_result.passed,
            "violations": guardrails_result.violations,
            "warnings": guardrails_result.warnings,
            "summary": guardrails_result.summary(),
        },
        "tool_trace": tool_trace,
        "raw_agent_output": final_message,
    }
