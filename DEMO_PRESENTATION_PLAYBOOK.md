# FundFlow AI Demo Presentation Playbook (Blunt Version)

Use this playbook to present confidently without overclaiming.

## 0. Mandatory Rehearsal Pack
- Run `python scripts/demo_test_pack.py` before each practice run.
- Execute all three cases in `DEMO_TEST_CASES.md` in order.
- For committee compliance, Case 1 must be run with `Live alerts` enabled so alert objects are created during stream replay.

## 1. What You Must Say Up Front (30 seconds)
"This prototype is graph-first fraud intelligence. The strongest production-ready component is fund-flow tracking, ring detection, and mule identification. The ML probability model is currently trained on PaySim-derived data plus synthetic augmentation, so probability calibration on real Indian bank data requires retraining with bank labels."

Why this works:
- You remove credibility risk immediately.
- Judges trust teams that separate what works now vs what needs bank data.

## 2. What Is Actually Hardcoded vs Computed

### Computed live from data
- Fund-flow tracing graph paths.
- Ring detection from graph cycles.
- Mule scoring from account behavior in graph.
- High-risk transaction alerts from scored rows.

### Simulated/demo UX (say this clearly)
- Account Aggregator pull button and response panel.
- Synthetic enrichment fields (KYC/CIBIL/VPA age generation where real source unavailable).

### No longer hardcoded (already fixed)
- Ring and mule alerts are generated from graph analysis, not fixed demo records.

## 3. 8-Minute Demo Flow

### Minute 0-1: Problem framing
- "Banks do not fail because they cannot classify one transaction. They fail because they cannot trace where money went."

### Minute 1-3: Fund Flow Explorer
- Open Fund Flow Explorer.
- Trace one suspicious account and show multi-hop money movement.
- Highlight time-span and hop count.

### Minute 3-4: Ring Detection
- Show rings table and one high-risk ring.
- Explain circular movement and why it indicates laundering behavior.

### Minute 4-5: Mule Network
- Show suspected mule nodes and pass-through behavior.
- Explain how this helps freeze decisioning.

### Minute 5-6: Investigation + Freeze Simulation
- Open a case.
- Run freeze simulation and show disrupted suspicious accounts vs collateral impact.

### Minute 6-7: ML Probability + Explainability
- Score a transaction from investigation workspace.
- Open Why? explanation and show top risk contributors.

### Minute 7-8: Honest production path
- "Graph pipeline works day one on any account-transaction graph. ML probability quality is improved by retraining on bank-labeled data with the same pipeline."

## 4. Answers to Likely Judge Questions

### Q: Is this hardcoded?
A: "The AA panel is simulated by design. Core graph analytics and alerting are data-driven from transaction graph and model scores."

### Q: Will this work on real Indian data?
A: "Graph analytics yes, immediately. Probability calibration requires retraining on bank labels. Architecture remains same."

### Q: Why trust your risk score?
A: "Thresholding is now consistent between training and inference; explanation factors are visible per scored transaction."

### Q: Why not claim 99% real-world accuracy?
A: "Because that would be dishonest with synthetic-origin training data. We report what is measured and what needs partner data."

## 5. Demo Rules (Non-Negotiable)
- Do not claim AA integration is live if it is simulated.
- Do not claim model is production-calibrated for all Indian fraud rails.
- Do emphasize graph investigation and containment workflow as current strength.
- Do show roadmap with exact next steps and acceptance criteria (see EXECUTION_PLAN_2_WEEKS.md).

## 6. One-Line Closing
"FundFlow AI is already strong at tracing and disrupting fraud networks; with partner-labeled Indian data, the same pipeline becomes a calibrated transaction probability engine for production."
