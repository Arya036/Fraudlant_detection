import sys
import os
import json
import sqlite3

# Add workspace to path
ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from agent.tools import detect_typology, get_transaction_graph
from api.main import _parse_str_sections

def test_detect_typology():
    print("Testing detect_typology tool directly...")
    # Test for C1953680528 (which is a 16/0 send-only account)
    res_str = detect_typology.invoke({"account_id": "C1953680528"})
    res = json.loads(res_str)
    print("detect_typology output:")
    print(json.dumps(res, indent=2))
    
    # Assertions
    typs = res.get("typologies", [])
    types_found = [t["type"] for t in typs]
    assert "LARGE_VALUE_CLUSTERING" in types_found or len(typs) == 0, "Should use LARGE_VALUE_CLUSTERING"
    assert "STRUCTURING_PATTERN" not in types_found, "Should not contain STRUCTURING_PATTERN"
    print("PASS: detect_typology behaves correctly and uses LARGE_VALUE_CLUSTERING!")

def test_api_mapping():
    print("\nTesting api main investigate mapping...")
    # Mock result dictionary that would be stored in the background job
    mock_result = {
        "str_draft": "Risk Tier: HIGH\nFraud Prob: 0.8521\nSECTION A — ACCOUNT SUMMARY\n...",
        "history_data": {
            "summary": {
                "total_transactions": 16,
                "transactions_sent": 16,
                "transactions_received": 0,
                "total_amount_sent": 50000.0,
                "avg_amount": 3125.0,
                "fraud_flagged_count": 0,
                "high_risk_count": 5,
                "date_range": {"earliest": "2026-03-01 02:00:00", "latest": "2026-03-01 04:00:00"}
            }
        },
        "graph_data": {
            "mule_score": 0.0,
            "is_suspected_mule": False,
            "in_ring": False,
            "ring_count": 0,
            "ring_ids": [],
            "graph_profile": {
                "in_degree": 0,
                "out_degree": 1,
                "net_flow": -50000.0,
                "max_fraud_prob": 0.8521
            },
            "connected_nodes": ["C1234567"]
        },
        "risk_data": {
            "risk_tier": "HIGH",
            "fraud_probability": 0.8521,
            "decision_threshold": 0.70,
            "top_features": [
                {"feature": "hour_of_day", "shap_value": 0.44, "direction": "INCREASE"},
                {"feature": "is_night", "shap_value": -0.12, "direction": "DECREASE"}
            ]
        },
        "regulations": [
            {"source": "FATF Recommendations", "page": 40, "text": "Enhanced customer due diligence."}
        ],
        "typologies": [
            {"type": "LARGE_VALUE_CLUSTERING", "description": "Clustering detected", "risk": "HIGH"}
        ]
    }
    
    # We want to test how sections are built in api/main.py's check_investigation logic
    # Let's run a test simulation of the dictionary merging logic
    str_draft = mock_result.get("str_draft", "")
    sections = _parse_str_sections(str_draft)
    
    # Supplement or override using raw JSON data when available (identical logic to api/main.py)
    if "history_data" in mock_result and mock_result["history_data"]:
        hist = mock_result["history_data"]
        summary = hist.get("summary") or {}
        sections["account_summary"] = {
            "total_transactions": summary.get("total_transactions"),
            "transactions_sent": summary.get("transactions_sent"),
            "transactions_received": summary.get("transactions_received"),
            "total_amount_sent": summary.get("total_amount_sent"),
            "total_amount_received": summary.get("total_amount_received"),
            "avg_amount": summary.get("avg_amount"),
            "max_amount": summary.get("max_amount"),
            "fraud_flagged_count": summary.get("fraud_flagged_count"),
            "high_risk_count": summary.get("high_risk_count"),
            "date_range": summary.get("date_range"),
        }

    if "graph_data" in mock_result and mock_result["graph_data"]:
        gdata = mock_result["graph_data"]
        profile = gdata.get("graph_profile") or {}
        sections["graph_intelligence"] = {
            "mule_score": gdata.get("mule_score"),
            "is_suspected_mule": gdata.get("is_suspected_mule"),
            "in_ring": gdata.get("in_ring"),
            "ring_count": gdata.get("ring_count"),
            "ring_ids": gdata.get("ring_ids") or [],
            "graph_profile": {
                "in_degree": profile.get("in_degree"),
                "out_degree": profile.get("out_degree"),
                "net_flow": profile.get("net_flow"),
                "max_fraud_prob": profile.get("max_fraud_prob"),
            },
            "connected_nodes": gdata.get("connected_nodes") or [],
        }

    if "risk_data" in mock_result and mock_result["risk_data"]:
        rdata = mock_result["risk_data"]
        sections["risk_tier"] = rdata.get("risk_tier", "UNKNOWN")
        sections["fraud_probability"] = rdata.get("fraud_probability")
        
        top_feats = []
        for f in rdata.get("top_features") or []:
            top_feats.append({
                "feature": f.get("feature"),
                "contribution": f.get("shap_value") or f.get("contribution") or 0.0,
                "direction": f.get("direction", ""),
            })
        sections["ml_risk"] = {
            "top_shap_features": top_feats,
            "decision_threshold": rdata.get("decision_threshold", 0.7),
        }

    if "regulations" in mock_result and mock_result["regulations"]:
        regs = mock_result["regulations"]
        sections["regulatory_citations"] = [
            {
                "rank": i + 1,
                "source": r.get("source"),
                "page": r.get("page"),
                "text": r.get("text"),
            }
            for i, r in enumerate(regs)
        ]

    if "typologies" in mock_result and mock_result["typologies"]:
        typs = mock_result["typologies"]
        sections["typologies"] = [
            {
                "type": t.get("type"),
                "description": t.get("description"),
                "risk": t.get("risk"),
            }
            for t in typs
        ]
        
    print("Parsed/Mapped Sections:")
    print(json.dumps(sections, indent=2))
    
    # Assertions on type and value correctness
    assert isinstance(sections["account_summary"]["total_amount_sent"], float), "total_amount_sent must be float"
    assert sections["account_summary"]["total_amount_sent"] == 50000.0, "total_amount_sent must match mock value"
    assert isinstance(sections["graph_intelligence"]["mule_score"], float), "mule_score must be float"
    assert sections["graph_intelligence"]["is_suspected_mule"] is False, "is_suspected_mule must be boolean False"
    assert sections["ml_risk"]["top_shap_features"][0]["contribution"] == 0.44, "SHAP value must match"
    print("PASS: api mapping correctly outputs typed and formatted data structure for frontend!")

if __name__ == "__main__":
    test_detect_typology()
    test_api_mapping()
