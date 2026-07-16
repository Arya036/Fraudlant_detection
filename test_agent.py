"""
test_agent.py — Full End-to-End Agent Investigation Test
=========================================================
Tests the complete pipeline:
  get_transaction_history → get_transaction_graph → score_risk
  → search_regulations → detect_typology → Draft STR

Requires: OPENAI_API_KEY in .env
Run: e:\Fraud_Detection\.venv\Scripts\python.exe test_agent.py
"""
import sys, os

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, "e:/PS6")
os.chdir("e:/PS6")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Sanity check: API key present
api_key = os.environ.get("OPENAI_API_KEY", "")
if not api_key or api_key.startswith("your") or len(api_key) < 20:
    print("[ERROR] OPENAI_API_KEY not set in .env")
    print("  Open e:\\PS6\\.env and add: OPENAI_API_KEY=sk-...")
    sys.exit(1)

DEMO_ACCOUNT = "C1953680528"   # 16 txns, all fraud-flagged, prob=1.0, CRITICAL

print("=" * 65)
print("SENTINEL AI -- Full Agent Investigation Test")
print("=" * 65)
print(f"  Account  : {DEMO_ACCOUNT}")
print(f"  Model    : {os.environ.get('AGENT_LLM_MODEL', 'gpt-4o-mini')}")
print(f"  API Key  : {api_key[:8]}...{api_key[-4:]}")
print("  Running agent (30-60 seconds)...")
print("-" * 65)

from agent.orchestrator import run_investigation

result = run_investigation(DEMO_ACCOUNT)

# Tool trace
print("\n[TOOL TRACE]")
for i, t in enumerate(result["tool_trace"], 1):
    print(f"  Step {i}: {t}")

# Guardrails
g = result["guardrails"]
status = "PASS" if g["passed"] else "FAIL"
print(f"\n[GUARDRAILS: {status}]")
for v in g["violations"]:
    print(f"  VIOLATION: {v}")
for w in g["warnings"]:
    print(f"  WARNING:   {w}")
if g["passed"] and not g["warnings"]:
    print("  All checks passed.")

# STR
print("\n[DRAFT STR]")
print("=" * 65)
print(result["str_draft"])
print("=" * 65)

# Save to file
out_path = "e:/PS6/test_str_output.txt"
with open(out_path, "w", encoding="utf-8") as f:
    f.write(result["str_draft"])
print(f"\n[SAVED] Draft STR written to: {out_path}")
print("\nTest complete.")
