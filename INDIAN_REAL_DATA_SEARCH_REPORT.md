# Indian Real Labeled Fraud Data Search Report

Date: 2026-04-14

## Executive Verdict

After a deep scan across RBI, NPCI, India data portals, Kaggle, and Hugging Face:
- No publicly downloadable transaction-level Indian banking or UPI dataset with bank-adjudicated per-transaction fraud labels was found.
- Public Indian sources are either:
  - aggregate statistics (monthly/yearly counts, values, volumes), or
  - synthetic/simulated datasets with generated labels or rule-engine flags.

This means production-level probability calibration for Indian rails requires partner data under NDA/DPA.

## Verified Sources and What They Actually Provide

| Source | Real transactions | Transaction-level rows | Fraud label quality | Indian rails | Verdict |
|---|---|---|---|---|---|
| NPCI Product Statistics | Yes (operational totals) | No | No per-txn labels | Yes | Aggregate only |
| NPCI Retail Payment Statistics | Yes (reports) | No | No per-txn labels | Yes | Aggregate only |
| RBI/India data portal (RBI resources) | Yes (official indicators) | Mostly no | No per-txn fraud labels | Yes | Aggregate/indicator only |
| Dataful RBI Banking Frauds dataset | Yes (official summarized) | No | Year-wise counts/values only | Yes | Aggregate only |
| Kaggle UPI Transactions 2024 | No | Yes | Synthetic fraud flag | Yes (simulated) | Synthetic |
| Kaggle UPI Payment Transactions Dataset | No | Yes | No validated bank labels | Yes (simulated) | Synthetic |
| Kaggle Banking Transactions 2019-2024 | No | Yes | Rule-based fraud generation logic | Yes (simulated) | Synthetic |
| Kaggle Pattern-Based UPI Risk Dataset | No | Yes | Risk flag, not confirmed fraud | Yes (simulated) | Synthetic |
| Kaggle IBM AML Transactions | No | Yes | Synthetic, simulator labels | No | Synthetic |
| Kaggle PaySim | No | Yes | Synthetic simulator labels | No | Synthetic |
| Kaggle IEEE-CIS Fraud Detection | Yes | Yes | Real labels | No (e-commerce CNP) | Real but non-Indian |
| Kaggle ULB Credit Card Fraud | Yes | Yes | Real labels | No (European card) | Real but non-Indian |
| Kaggle Elliptic | Yes | Yes | Real illicit/licit labels | No (Bitcoin) | Real but non-Indian |
| Hugging Face INDIA_FRAUD_DETECTION_JSONL_V1 | No | Small text scenarios | Explicitly synthetic scenarios | India-themed | Synthetic text, not transaction feed |

## Key Links

### Official Indian public data (aggregate)
- https://www.npci.org.in/product/upi/product-statistics
- https://www.npci.org.in/retail-payment-statistics
- https://dataful.in/datasets/19682/
- https://ckandev.indiadataportal.com/dataset/national-payments-corporation-of-india-npci
- https://ckandev.indiadataportal.com/dataset/reserve-bank-of-india

### Indian-themed datasets that are synthetic
- https://www.kaggle.com/datasets/skullagos5246/upi-transactions-2024-dataset
- https://www.kaggle.com/datasets/devildyno/upi-payment-transactions-dataset
- https://www.kaggle.com/datasets/belbino/indian-banking-transactions-20192024
- https://www.kaggle.com/datasets/kalpitlabs/upi-fraud-detection-dataset-india-synthetic
- https://www.kaggle.com/datasets/ealtman2019/ibm-transactions-for-anti-money-laundering-aml

### Real labeled benchmarks (non-Indian)
- https://www.kaggle.com/c/ieee-fraud-detection
- https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
- https://www.kaggle.com/datasets/ellipticco/elliptic-data-set

## Practical Path To Add Real Indian Labeled Data

1. Open partner data channels immediately.
   - PSU/private bank fraud analytics teams
   - UPI PSP/payment gateway risk teams
   - Fraud operations units with confirmed adjudication outcomes

2. Define a minimum calibration contract.
   - At least 6 months of data
   - Rails: UPI, IMPS, NEFT, RTGS, cards/net-banking where available
   - Label provenance: chargeback/FIR/recovery/final fraud decision
   - Label timestamp to prevent leakage

3. Request minimally sufficient fields.
   - txn timestamp, amount, rail/channel, sender/receiver hashed IDs, status
   - optional device/IP/merchant risk metadata

4. Calibrate and validate using leakage-safe split.
   - strict time split
   - out-of-time holdout
   - per-rail metrics and reliability calibration

## Important Note

RBI mobile endpoints currently enforce anti-bot challenge pages during automated fetch, but cross-verified RBI/NPCI mirrors and data portals show public Indian fraud data is published as aggregate indicators, not transaction-level labeled records.
