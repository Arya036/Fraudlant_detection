# FundFlow AI: 2-Week Execution Plan

This plan is prioritized for maximum credibility gain in front of judges and for fastest path toward production-grade behavior.

## Goals
- Remove trust-killing inconsistencies and demo artifacts.
- Make probability scoring behavior defensible and repeatable.
- Strengthen real-data readiness without pretending full production deployment.

## Priority Definitions
- P0: Must complete for credible demo and technical defense.
- P1: High-value improvements for reliability and maintainability.
- P2: Nice-to-have polish.

## Week 1 (Reliability + Honesty + Data Path)

### P0-0: Acquire Real Labeled Indian Transaction Data (Calibration Track)
- Status: IN PROGRESS (external dependency)
- Why this is now top priority:
  - Public search across RBI/NPCI/Dataful/Kaggle/HuggingFace found no open transaction-level Indian bank dataset with bank-adjudicated per-transaction fraud labels.
  - Public Indian datasets are mostly synthetic, rule-generated, or aggregate monthly/yearly statistics.
- Verified findings:
  - RBI/NPCI public portals provide macro indicators and product statistics, not per-transaction labeled fraud data.
  - Multiple Kaggle "Indian/UPI fraud" datasets explicitly state synthetic generation, rule-engine labels, or simulated logic.
- Partner data channels to open immediately:
  - PSU/private bank fraud analytics team (NDA + DPA)
  - Payment gateway or UPI PSP risk team
  - Internal incident + chargeback + complaint linked datasets
- Minimum dataset contract for production calibration:
  - At least 6 months of transaction history
  - Unified rails: UPI, IMPS, NEFT, RTGS, cards/net banking where available
  - Per-transaction label provenance (chargeback/FIR/recovery/final adjudication)
  - Core fields: txn timestamp, sender/receiver identifiers (hashed), amount, channel/rail, status, device/risk metadata if available
  - Label timestamps (when fraud was confirmed) to prevent time leakage
- Acceptance criteria:
  - Signed data-sharing approval (NDA/DPA) and secure transfer path
  - Data quality profile published (nulls, class rate, rail coverage, label lag)
  - Calibration dataset ready for leakage-safe train/validation split

### P0-1: Threshold Consistency Across Training and Inference
- Status: DONE
- Files changed:
  - models/predictor.py
- What changed:
  - Inference now uses decision_threshold from model metadata instead of hardcoded 0.5.
  - Batch scoring also uses the metadata threshold.
- Acceptance criteria:
  - predict_single and predict_batch classify with identical threshold to model_metadata.json.
  - API score responses include decision_threshold.

### P0-2: Remove Hardcoded Ring/Mule Alerts
- Status: DONE
- Files changed:
  - alerts/bulk_generate.py
- What changed:
  - Removed synthetic rings_demo and mule_demo injection.
  - Added graph-derived alert generation from suspicious scored transactions.
- Acceptance criteria:
  - alerts/bulk_generate.py contains no hardcoded demo ring/mule payloads.
  - Running alert generation creates ring/mule alerts from actual graph computation.

### P0-3: Fix Explainability Contract Drift
- Status: DONE
- Files changed:
  - explainability/explain.py
  - dashboard/js/app.js
- What changed:
  - Backend now exposes both top_factors and top_contributors keys.
  - Frontend SHAP modal now supports both keys and no longer assumes missing base/target values.
- Acceptance criteria:
  - Clicking Why? on a non-demo transaction shows factors instead of fallback error.

### P0-4: Real-Data Upload Pipeline (From Parse-Only to Ingest-and-Score)
- Status: DONE (v1)
- Target files:
  - api/main.py
  - ingestion/loader.py
  - features/engineering.py
  - models/predictor.py
- Work:
  - Extend upload endpoint to support schema mapping + validation.
  - Persist mapped transactions to DB and score them.
- Acceptance criteria:
  - Upload endpoint supports bank CSV with column mapping payload.
  - Uploaded rows are visible in transactions API with fraud_probability populated.

Implemented in v1:
- Supports mapping_json for source-to-canonical column mapping.
- Normalizes to internal schema, optionally scores, optionally persists.
- Returns sample scored rows and flagged count in response.

Known gap:
- Frontend column-mapping UI is now wired to mapping_json upload flow.

### P1-1: Leakage-Safe Training Protocol
- Status: DONE
- Target files:
  - models/trainer.py
  - features/graph_features.py
  - features/engineering.py
- Work:
  - Split train/test before graph feature generation per fold/time window.
  - Add time-based split option and grouped-account split option.
- Acceptance criteria:
  - Training run outputs both random split and leakage-safe split metrics.
  - Leakage-safe metric report is persisted in model_metadata.json.

Implemented:
- Training now reports two protocols:
  - random_stratified_split (benchmark only)
  - leakage_safe_time_split_train_graph_only (canonical)
- Canonical model is trained/evaluated on time split.
- Graph features for canonical evaluation are built from train window only.
- model_metadata.json now stores metrics_random_split and metrics_leakage_safe.

### P1-2: Inference/Training Feature Parity Check
- Status: NOT STARTED
- Target files:
  - models/trainer.py
  - models/predictor.py
  - tests/
- Work:
  - Add parity validation asserting same feature list/order/transform assumptions.
- Acceptance criteria:
  - CI/test command fails if online and offline feature contracts diverge.

## Week 2 (Production Readiness + Demo Stability)

### P0-5: API Security Baseline
- Status: DONE
- Target files:
  - api/main.py
- Work:
  - Add API key auth for write/scoring routes.
  - Replace wildcard CORS with configurable origins.
- Acceptance criteria:
  - Unauthorized score/upload requests return 401.
  - Allowed origins are environment-configurable.

Implemented:
- API key dependency added for:
  - POST /api/score
  - POST /api/transactions/upload
- CORS wildcard removed; origins now loaded from FUNDFLOW_ALLOWED_ORIGINS.
- API key now loaded from FUNDFLOW_API_KEY.

### P0-6: Live Alert Trigger on Streamed Scoring
- Status: DONE
- Target files:
  - api/main.py
  - dashboard/index.html
  - dashboard/js/app.js
  - dashboard/js/websocket.js
- Work:
  - Added strict live alert object creation during replay scoring for high-risk transactions.
  - Added one-click `Live alerts` toggle in simulator control bar.
  - Added real-time live alert counter and stream event rendering.
- Acceptance criteria:
  - Running replay with `Live alerts` enabled creates alert rows in `alerts` table.
  - Simulator stats return `live_alerts_created` and `live_alerts_enabled`.

### P0-7: Rehearsed 3-Case Demo Pack
- Status: DONE
- Target files:
  - DEMO_TEST_CASES.md
  - scripts/demo_test_pack.py
  - data/raw/demo_upload_sample.csv
  - DEMO_PRESENTATION_PLAYBOOK.md
- Work:
  - Added explicit 3-case demo checklist with pass criteria.
  - Added helper script that prints live anchors for rehearsal.
  - Added ready-to-upload CSV sample for mapping demo.
- Acceptance criteria:
  - Team can execute exactly 3 repeatable demo test cases before judging.
  - Case 1 demonstrates live stream + live alert object creation.

### P1-3: Live Graph Incremental Updates
- Status: NOT STARTED
- Target files:
  - api/main.py
  - graph/fund_flow.py
  - ingestion/simulator.py
- Work:
  - Persist simulator replay txns and incrementally update in-memory graph.
- Acceptance criteria:
  - Newly replayed transactions are traceable immediately in fund-flow explorer.

### P1-4: Replace Orphaned Risk Modules or Remove Them
- Status: NOT STARTED
- Target files:
  - scoring/risk_engine.py
  - graph/risk_propagation.py
  - api/main.py
- Work:
  - Either wire these into runtime score output or explicitly deprecate/remove.
- Acceptance criteria:
  - No dead-risk modules remain undocumented.
  - Runtime path has one authoritative risk-composition method.

### P2-1: Test Coverage Baseline
- Status: NOT STARTED
- Target files:
  - tests/test_predictor_threshold.py
  - tests/test_bulk_alerts.py
  - tests/test_explain_api_contract.py
- Acceptance criteria:
  - At least 3 critical-path tests pass locally.

### P2-2: Performance Benchmark Harness
- Status: NOT STARTED
- Target files:
  - scripts/benchmark_scoring.py
  - README.md
- Work:
  - Add reproducible p50/p95 latency benchmark script.
- Acceptance criteria:
  - README only claims measured performance from benchmark output.

## Immediate Next 3 Tasks
1. Add parity checks between offline training features and online inference features (P1-2).
2. Add baseline tests for secured scoring/upload endpoints, simulate live-alert path, and leakage-safe metadata fields.
3. Add grouped-account leakage split as optional protocol alongside time split.
