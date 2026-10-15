export interface SalesRecord {
  date: string; // YYYY-MM-DD
  store_id: string;
  sku: string;
  units_sold: number;
  unit_price: number;
}

export interface InventoryRecord {
  date: string; // YYYY-MM-DD
  store_id: string;
  sku: string;
  recorded_stock: number;
}

export interface PromotionRecord {
  date: string; // YYYY-MM-DD
  store_id: string;
  sku: string;
  promotion_flag: boolean | number;
}

export interface StoreRecord {
  store_id: string;
  store_name: string;
  region: string;
}

export interface GroundTruthRecord {
  store_id: string;
  sku: string;
  date?: string;
  is_phantom_stockout: boolean;
  notes?: string;
}

export interface ProductCatalogItem {
  sku: string;
  product_name: string;
  category: string;
  default_price: number;
}

export type RiskLevel = 'severe' | 'high' | 'medium' | 'low';

export type VerificationStatus = 'pending' | 'verified_stockout' | 'false_alarm' | 'needs_recheck';

export interface RiskScoreBreakdown {
  velocityDropScore: number;     // 0-100: How sharply sales plummeted vs baseline
  zeroStreakScore: number;       // 0-100: Consecutive days with 0 sales
  stockDiscrepancyScore: number; // 0-100: How ample recorded stock is relative to baseline demand
  promoDiscrepancyScore: number; // 0-100: Amplified drop during active marketing promotion
  regularityWeight: number;      // 0-1: Intermittency damper (prevents flagging naturally slow items)
  dataConfidence: number;        // 0-1: Data completeness, snapshot freshness, baseline depth
  rawCompositeScore: number;     // 0-100 before confidence multiplier
  finalRiskScore: number;        // 0-100 final normalized score
}

export interface DetectionWeights {
  velocityDropWeight: number;      // e.g. 0.35
  zeroStreakWeight: number;        // e.g. 0.25
  stockDiscrepancyWeight: number;  // e.g. 0.20
  promoDiscrepancyWeight: number;  // e.g. 0.20
}

export interface TimelineDataPoint {
  date: string;
  units_sold: number;
  recorded_stock: number | null;
  is_promoted: boolean;
  baseline_estimate: number;
}

export interface VerificationCase {
  id: string; // `${storeId}__${sku}`
  sku: string;
  productName: string;
  category: string;
  storeId: string;
  storeName: string;
  region: string;
  recordedStock: number;
  recentSalesAvg: number;        // units/day (e.g. last 7 days)
  baselineSalesAvg: number;      // units/day (historical baseline e.g. prior 21-28 days)
  dropPercent: number;           // % decline in velocity
  consecutiveZeroSalesDays: number;
  regularityRatio: number;       // % of days product sells historically
  isPromoted: boolean;
  unitPrice: number;
  estimatedLostUnits: number;    // estimated missed unit sales
  estimatedSalesAtRisk: number;  // dollar value at risk
  riskScore: number;             // 0 - 100
  riskLevel: RiskLevel;
  confidenceLevel: number;       // 0 - 100%
  reasons: string[];             // Explainability bullet points
  recommendedAction: string;     // Shelf audit instructions
  status: VerificationStatus;
  userNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  groundTruth?: boolean;         // Label if provided
  dailyTimeline: TimelineDataPoint[];
  breakdown: RiskScoreBreakdown;
  lastInventoryDate?: string;
  isStaleInventory?: boolean;
}

export interface DatasetState {
  sales: SalesRecord[];
  inventory: InventoryRecord[];
  promotions: PromotionRecord[];
  stores: StoreRecord[];
  groundTruth: GroundTruthRecord[];
  isDemoData: boolean;
  lastUpdated: string;
}

export interface EvaluationMetrics {
  hasGroundTruth: boolean;
  totalLabelledCases: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precisionAtK: number;          // Precision in top K ranked queue
  overallPrecision: number;
  overallRecall: number;
  falsePositiveRate: number;
  kValue: number;
  storeMetrics: Record<string, {
    storeName: string;
    precision: number;
    recall: number;
    casesCount: number;
  }>;
}

export interface ColumnMapping {
  date: string;
  store_id: string;
  sku: string;
  units_sold?: string;
  unit_price?: string;
  recorded_stock?: string;
  promotion_flag?: string;
  store_name?: string;
  region?: string;
  is_phantom_stockout?: string;
}
