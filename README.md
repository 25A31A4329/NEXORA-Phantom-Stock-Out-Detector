# NEXORA — Phantom Stock-Out Intelligence & Verification Queue

> Intelligent decision-support system for retail operations, loss prevention, and inventory auditing to detect suspicious phantom inventory stock-outs, explain causes, and prioritize physical shelf verification queues.

---

## 1. Problem Statement

Retail inventory management systems frequently display positive recorded stock on-hand even when shoppers find completely empty shelves. This phenomenon, known as a **phantom stock-out** (or ghost inventory), occurs due to:
- **Misplacement**: Products shelved in adjacent bays, misplaced on top-stock risers, or stranded in backroom pallets.
- **Unworked Shipments**: Goods received at dock doors that haven't been brought to the sales floor.
- **Shrinkage & Theft**: Unrecorded theft, scan avoidance, or cashier under-ringing leaving ghost stock on system books.
- **Barcode & Tag Defects**: Damaged shelf tags, scratched UPCs, or planogram mismatches preventing successful checkout scans.

**Core Design Tenet**: A suspected phantom stock-out is **never** automatically a confirmed stock-out. NEXORA transparently communicates statistical uncertainty and directly orchestrates physical store verification.

---

## 2. System Architecture

NEXORA operates as a high-performance, full-stack decision-support platform:

```
┌─────────────────────────────────────────────────────────────┐
│                      NEXORA Frontend                        │
│  - React 19 + TypeScript + Tailwind CSS                      │
│  - Responsive Dark Navy & Teal Retail Analytics Dashboard   │
│  - Reusable Interactive SVG Timelines & Distribution Charts │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│  Deterministic Engine        │ │   Server-Side Proxy API     │
│  (100% Offline / No API Key) │ │   (server.ts / Express)     │
│  - Baseline vs Recent Delta  │ │   - /api/health             │
│  - Poisson Intermittency     │ │   - /api/gemini/explain     │
│  - Stock Discrepancy Index   │ │   - /api/gemini/summary     │
│  - Promotion Lift Anomaly    │ │   (Gemini 3.8 Flash SDK)    │
│  - Explainable Reasons       │ └──────────────┬──────────────┘
└──────────────┬───────────────┘                │
               │                                ▼
               ▼                 ┌─────────────────────────────┐
┌──────────────────────────────┐ │ Optional Gemini 3.8 Flash   │
│  Browser Persistence Layer   │ │ Natural Language Auditor    │
│  - LocalStorage / Memory     │ └─────────────────────────────┘
│  - Audit Decisions & Notes   │
└──────────────────────────────┘
```

---

## 3. Supported CSV Data Formats

NEXORA supports four core retail operational CSV files plus an optional benchmark file:

### A. Daily Sales Data (`sales.csv`) [Required]
| Column | Type | Description |
|---|---|---|
| `date` | YYYY-MM-DD | Transaction date |
| `store_id` | String | Store code (e.g. `ST-101`) |
| `sku` | String | SKU code (e.g. `SKU-1001`) |
| `units_sold` | Number | Quantity sold (e.g. `14`) |
| `unit_price` | Number | Retail selling price in INR (e.g. `414.00`) |

### B. Inventory Snapshots (`inventory.csv`) [Recommended]
| Column | Type | Description |
|---|---|---|
| `date` | YYYY-MM-DD | Snapshot date |
| `store_id` | String | Store code |
| `sku` | String | SKU code |
| `recorded_stock` | Number | Recorded on-hand perpetual inventory |

### C. Promotion Calendar (`promotions.csv`) [Optional]
| Column | Type | Description |
|---|---|---|
| `date` | YYYY-MM-DD | Promotion active date |
| `store_id` | String | Store code |
| `sku` | String | SKU code |
| `promotion_flag` | Boolean/Int | 1 or true if actively promoted |

### D. Store Master (`stores.csv`) [Optional]
| Column | Type | Description |
|---|---|---|
| `store_id` | String | Store code |
| `store_name` | String | Store name (e.g. `Metro Flagship Downtown`) |
| `region` | String | Market zone (e.g. `North Urban`) |

### E. Ground-Truth Labels (`ground_truth.csv`) [Optional]
| Column | Type | Description |
|---|---|---|
| `store_id` | String | Store code |
| `sku` | String | SKU code |
| `is_phantom_stockout` | Boolean | `true` if physical audit confirmed shelf was empty |
| `notes` | String | Root cause discovery notes |

---

## 4. Detection Scoring Formula & Currency Conversion

> **Currency & Exchange Rate Assumption:**
> All monetary calculations in NEXORA are strictly denominated in Indian Rupees (INR, ₹) formatted using locale `en-IN` (e.g., `₹2,26,009`).
> Demo retail products are converted from USD using a standard documented exchange-rate assumption of **1 USD = 83 INR**.

For each SKU-store combination, NEXORA calculates:
1. **Historical Baseline Velocity**: Average units/day over preceding 28 days.
2. **Recent Velocity**: Average units/day over recent 7 days.
3. **Velocity Drop %**: `((Baseline - Recent) / Baseline) * 100`.
4. **Consecutive Zero-Sales Streak**: Number of consecutive days with zero sales recorded.

### Weighted Composite Score:
$$\text{RawComposite} = w_{\text{drop}} \cdot S_{\text{drop}} + w_{\text{zero}} \cdot S_{\text{zero}} + w_{\text{stock}} \cdot S_{\text{stock}} + w_{\text{promo}} \cdot S_{\text{promo}}$$

Default Weights:
- $w_{\text{drop}} = 0.35$ (Velocity Collapse)
- $w_{\text{zero}} = 0.25$ (Zero Streak)
- $w_{\text{stock}} = 0.20$ (Positive Stock Discrepancy Index)
- $w_{\text{promo}} = 0.20$ (Promotional Lift Discrepancy)

### Intermittency & Regularity Damping Factor:
To prevent false alarms on naturally slow-moving products (e.g., gourmet truffle oil that normally sells once every 10 days), NEXORA calculates a **Demand Regularity Ratio**:
- If baseline velocity $< 0.6$ units/day or regularity $< 25\%$, an **intermittency damper of 0.15×** is applied.
- If system recorded stock is $\le 0$, the case is classified as an **ordinary out-of-stock**, not a phantom stock-out (risk score damped to 0.15×).

### Sales at Risk Formula:
$$\text{MissedDailyDemand} = \max(0, \text{BaselineSalesAvg} - \text{RecentSalesAvg})$$
$$\text{LostUnits} = \text{MissedDailyDemand} \times \min(7, \max(1, \text{ConsecutiveZeroDays}))$$
$$\text{SalesAtRisk} (₹) = \text{LostUnits} \times \text{UnitRetailPrice} (₹)$$

---

## 5. Verification & Audit Protocol

Associate audit outcomes can be marked in the Verification Queue:
- **Confirmed Phantom Stock-Out**: Shelf was physically empty despite system balance; trigger floor replenishment.
- **False Alarm**: Product found on shelf; record tagged as normal demand variation.
- **Needs Recheck**: Potential backroom pallet or cross-merchandising display pending verification.

Decisions are saved locally in browser storage with timestamps and auditor notes.

---

## 6. How to Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Server runs at `http://localhost:3000`.
