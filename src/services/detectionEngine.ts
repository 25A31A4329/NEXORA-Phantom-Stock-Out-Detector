import {
  DatasetState,
  VerificationCase,
  RiskScoreBreakdown,
  DetectionWeights,
  RiskLevel,
  TimelineDataPoint,
  ProductCatalogItem,
} from '../types';
import { DEMO_PRODUCTS } from './demoData';

export const DEFAULT_DETECTION_WEIGHTS: DetectionWeights = {
  velocityDropWeight: 0.35,      // Weight for relative sales drop
  zeroStreakWeight: 0.25,        // Weight for streak of 0-sales days
  stockDiscrepancyWeight: 0.20,  // Weight for positive stock on hand vs sales collapse
  promoDiscrepancyWeight: 0.20,  // Weight for missing promo lift
};

// Map of SKU to catalog metadata for display
const catalogMap = new Map<string, ProductCatalogItem>();
DEMO_PRODUCTS.forEach(p => catalogMap.set(p.sku, p));

export function getProductInfo(sku: string): { productName: string; category: string; defaultPrice: number } {
  const item = catalogMap.get(sku);
  if (item) {
    return {
      productName: item.product_name,
      category: item.category,
      defaultPrice: item.default_price,
    };
  }
  // Generic fallback if user uploads custom SKU
  return {
    productName: `Item ${sku}`,
    category: 'General Retail',
    defaultPrice: 829.00, // INR equivalent (~$9.99 * 83)
  };
}

/**
 * Execute the deterministic explainable detection algorithm across the dataset.
 */
export function runDetectionAlgorithm(
  dataset: DatasetState,
  weights: DetectionWeights = DEFAULT_DETECTION_WEIGHTS,
  existingStatuses: Record<string, { status: any; notes?: string; verifiedAt?: string }> = {},
  recentWindowDays: number = 7,
  baselineWindowDays: number = 28
): VerificationCase[] {
  const { sales, inventory, promotions, stores, groundTruth } = dataset;
  if (!sales || sales.length === 0) return [];

  // Index stores
  const storeMap = new Map<string, { name: string; region: string }>();
  stores.forEach(s => {
    storeMap.set(s.store_id, { name: s.store_name, region: s.region });
  });

  // Index ground truth if available
  const gtMap = new Map<string, boolean>();
  if (groundTruth && groundTruth.length > 0) {
    groundTruth.forEach(gt => {
      gtMap.set(`${gt.store_id}__${gt.sku}`, gt.is_phantom_stockout);
    });
  }

  // Index promotions by `${date}__${store_id}__${sku}`
  const promoSet = new Set<string>();
  promotions.forEach(p => {
    const isPromo = p.promotion_flag === true || p.promotion_flag === 1 || String(p.promotion_flag).toLowerCase() === 'true';
    if (isPromo) {
      promoSet.add(`${p.date}__${p.store_id}__${p.sku}`);
    }
  });

  // Group inventory by store_id + sku, sorted by date
  const inventoryByPair = new Map<string, Array<{ date: string; recorded_stock: number }>>();
  inventory.forEach(inv => {
    const key = `${inv.store_id}__${inv.sku}`;
    if (!inventoryByPair.has(key)) {
      inventoryByPair.set(key, []);
    }
    inventoryByPair.get(key)!.push({
      date: inv.date,
      recorded_stock: Number(inv.recorded_stock) || 0,
    });
  });

  // Sort inventory records chronologically
  inventoryByPair.forEach(list => list.sort((a, b) => a.date.localeCompare(b.date)));

  // Group sales by store_id + sku
  const salesByPair = new Map<string, Array<{ date: string; units_sold: number; unit_price: number }>>();
  sales.forEach(s => {
    const key = `${s.store_id}__${s.sku}`;
    if (!salesByPair.has(key)) {
      salesByPair.set(key, []);
    }
    salesByPair.get(key)!.push({
      date: s.date,
      units_sold: Number(s.units_sold) || 0,
      unit_price: Number(s.unit_price) || 0,
    });
  });

  const cases: VerificationCase[] = [];

  // Iterate each store-sku pair
  salesByPair.forEach((records, key) => {
    const [storeId, sku] = key.split('__');
    const storeInfo = storeMap.get(storeId) || { name: `Store ${storeId}`, region: 'General' };
    const prodInfo = getProductInfo(sku);

    // Sort sales records chronologically
    records.sort((a, b) => a.date.localeCompare(b.date));

    if (records.length < 5) {
      // Insufficient data points to build reliable baseline
      return;
    }

    const totalDays = records.length;
    const splitIndex = Math.max(1, totalDays - recentWindowDays);

    const baselineRecords = records.slice(Math.max(0, splitIndex - baselineWindowDays), splitIndex);
    const recentRecords = records.slice(splitIndex);

    if (baselineRecords.length === 0 || recentRecords.length === 0) {
      return;
    }

    // Historical Baseline calculations
    const baselineTotalUnits = baselineRecords.reduce((sum, r) => sum + r.units_sold, 0);
    const baselineSalesAvg = baselineTotalUnits / baselineRecords.length;
    const nonZeroBaselineDays = baselineRecords.filter(r => r.units_sold > 0).length;
    const regularityRatio = nonZeroBaselineDays / baselineRecords.length; // 0.0 to 1.0

    // Recent Window calculations
    const recentTotalUnits = recentRecords.reduce((sum, r) => sum + r.units_sold, 0);
    const recentSalesAvg = recentTotalUnits / recentRecords.length;

    // Unit Price estimate
    const latestPrice = recentRecords[recentRecords.length - 1]?.unit_price ||
      baselineRecords[baselineRecords.length - 1]?.unit_price ||
      prodInfo.defaultPrice;

    // Consecutive zero-sales streak counting from latest day backwards
    let consecutiveZeroSalesDays = 0;
    for (let i = recentRecords.length - 1; i >= 0; i--) {
      if (recentRecords[i].units_sold === 0) {
        consecutiveZeroSalesDays++;
      } else {
        break;
      }
    }

    // Inventory snapshot data for this pair
    const invRecords = inventoryByPair.get(key) || [];
    const latestInv = invRecords.length > 0 ? invRecords[invRecords.length - 1] : null;
    const recordedStock = latestInv ? Math.max(0, latestInv.recorded_stock) : 0;
    const lastInventoryDate = latestInv ? latestInv.date : undefined;

    // Check for stale inventory (snapshot older than 4 days before latest sales date)
    const latestSalesDate = recentRecords[recentRecords.length - 1].date;
    let isStaleInventory = false;
    if (latestInv) {
      const invTimestamp = new Date(latestInv.date).getTime();
      const salesTimestamp = new Date(latestSalesDate).getTime();
      const daysDiff = (salesTimestamp - invTimestamp) / (1000 * 60 * 60 * 24);
      if (daysDiff > 4) {
        isStaleInventory = true;
      }
    } else {
      isStaleInventory = true;
    }

    // Promotion check in recent window
    const isPromoted = recentRecords.some(r => promoSet.has(`${r.date}__${storeId}__${sku}`));

    // Velocity Drop %
    let dropPercent = 0;
    if (baselineSalesAvg > 0.05) {
      dropPercent = Math.max(0, Math.min(100, ((baselineSalesAvg - recentSalesAvg) / baselineSalesAvg) * 100));
    }

    // ==========================================
    // DETERMINISTIC RISK SCORING ENGINE
    // ==========================================

    // Feature 1: Velocity Drop Score (0-100)
    // Steep drop from baseline creates strong anomaly signal
    let velocityDropScore = 0;
    if (dropPercent >= 85) velocityDropScore = 100;
    else if (dropPercent >= 70) velocityDropScore = 80;
    else if (dropPercent >= 50) velocityDropScore = 60;
    else if (dropPercent >= 30) velocityDropScore = 35;
    else velocityDropScore = Math.max(0, dropPercent * 0.5);

    // Feature 2: Consecutive Zero-Sales Run Score (0-100)
    // Scaled against expected sales frequency
    let zeroStreakScore = 0;
    if (consecutiveZeroSalesDays >= 5) zeroStreakScore = 100;
    else if (consecutiveZeroSalesDays === 4) zeroStreakScore = 85;
    else if (consecutiveZeroSalesDays === 3) zeroStreakScore = 65;
    else if (consecutiveZeroSalesDays === 2) zeroStreakScore = 40;
    else if (consecutiveZeroSalesDays === 1) zeroStreakScore = 15;

    // Feature 3: Stock Discrepancy Index (0-100)
    // Key phantom stock-out indicator: System claims plenty of stock, yet sales are 0!
    // Note: If recordedStock is 0, this is a normal out-of-stock (system knows it's 0), so stockDiscrepancy is 0!
    let stockDiscrepancyScore = 0;
    if (recordedStock <= 0) {
      stockDiscrepancyScore = 0; // Not a phantom stock-out if system stock is 0
    } else {
      const daysOfSupply = baselineSalesAvg > 0 ? recordedStock / baselineSalesAvg : recordedStock;
      if (recordedStock >= 20 || daysOfSupply >= 4) stockDiscrepancyScore = 100;
      else if (recordedStock >= 10 || daysOfSupply >= 2) stockDiscrepancyScore = 80;
      else if (recordedStock >= 5) stockDiscrepancyScore = 60;
      else if (recordedStock >= 2) stockDiscrepancyScore = 35;
      else stockDiscrepancyScore = 15;
    }

    // Feature 4: Promotion Discrepancy Score (0-100)
    // When an item is on promo, demand should surge. Zero sales during promo is highly anomalous.
    let promoDiscrepancyScore = 0;
    if (isPromoted) {
      if (consecutiveZeroSalesDays >= 2 || dropPercent >= 75) {
        promoDiscrepancyScore = 100;
      } else if (dropPercent >= 40) {
        promoDiscrepancyScore = 60;
      } else {
        promoDiscrepancyScore = 30;
      }
    }

    // Feature 5: Intermittency & Regularity Dampener (0.0 to 1.0)
    // CRITICAL: Avoid flagging slow movers or items with low baseline demand!
    // If an item naturally sells only once every 5-10 days (low regularity and low baseline),
    // a 3-day zero streak is completely normal and expected.
    let regularityWeight = 1.0;
    if (baselineSalesAvg < 0.6 || regularityRatio < 0.25) {
      // Very slow mover / sporadic demand: heavily dampen risk score
      regularityWeight = 0.15;
    } else if (baselineSalesAvg < 1.5 || regularityRatio < 0.50) {
      // Moderate intermittent demand
      regularityWeight = 0.50;
    } else if (regularityRatio >= 0.80) {
      // Consistent staple: full weight
      regularityWeight = 1.0;
    } else {
      regularityWeight = 0.80;
    }

    // Feature 6: Data Quality and Confidence Multiplier (0.4 to 1.0)
    // Reduce confidence when baseline is short or inventory snapshot is stale
    let dataConfidence = 1.0;
    if (baselineRecords.length < 14) dataConfidence *= 0.80;
    if (isStaleInventory) dataConfidence *= 0.75;
    if (invRecords.length === 0) dataConfidence *= 0.60;

    // Normalize weights to sum to 1.0
    const wSum =
      weights.velocityDropWeight +
      weights.zeroStreakWeight +
      weights.stockDiscrepancyWeight +
      weights.promoDiscrepancyWeight;

    const normW_Drop = weights.velocityDropWeight / (wSum || 1);
    const normW_Zero = weights.zeroStreakWeight / (wSum || 1);
    const normW_Stock = weights.stockDiscrepancyWeight / (wSum || 1);
    const normW_Promo = weights.promoDiscrepancyWeight / (wSum || 1);

    // Calculate Raw Composite Score
    const rawCompositeScore =
      (velocityDropScore * normW_Drop +
       zeroStreakScore * normW_Zero +
       stockDiscrepancyScore * normW_Stock +
       promoDiscrepancyScore * normW_Promo);

    // Apply Intermittency Dampener and Data Confidence Multiplier
    // Note: If recorded stock is 0, we heavily cap the phantom risk because it's an ordinary stock-out
    let finalRiskScore = rawCompositeScore * regularityWeight * (recordedStock > 0 ? 1.0 : 0.15);
    finalRiskScore = Math.max(0, Math.min(100, Math.round(finalRiskScore)));

    // Confidence Level (0-100%)
    const confidenceLevel = Math.round(dataConfidence * 100);

    // Risk Level Tier
    let riskLevel: RiskLevel = 'low';
    if (finalRiskScore >= 75) riskLevel = 'severe';
    else if (finalRiskScore >= 55) riskLevel = 'high';
    else if (finalRiskScore >= 35) riskLevel = 'medium';
    else riskLevel = 'low';

    // Business Impact Calculation (Estimated Potential Sales at Risk)
    // Formula: Expected Missed Daily Demand * Estimated Affected Days * Unit Price
    const missedDailyDemand = Math.max(0, baselineSalesAvg - recentSalesAvg);
    const affectedDays = Math.max(1, Math.min(recentWindowDays, consecutiveZeroSalesDays || 2));
    const estimatedLostUnits = Math.round(missedDailyDemand * affectedDays * 10) / 10;
    const estimatedSalesAtRisk = Math.round(estimatedLostUnits * latestPrice * 100) / 100;

    // Explainable Reason Generation
    const reasons: string[] = [];

    if (dropPercent >= 80 && baselineSalesAvg >= 3) {
      reasons.push(`Sales collapsed by ${dropPercent.toFixed(0)}% from historical velocity of ${baselineSalesAvg.toFixed(1)} units/day`);
    } else if (dropPercent >= 50) {
      reasons.push(`Significant velocity drop of ${dropPercent.toFixed(0)}% relative to 28-day baseline`);
    }

    if (consecutiveZeroSalesDays >= 3) {
      reasons.push(`${consecutiveZeroSalesDays} consecutive days with zero sales recorded on shelf`);
    }

    if (recordedStock >= 10 && (consecutiveZeroSalesDays >= 2 || dropPercent >= 60)) {
      reasons.push(`Positive on-hand inventory discrepancy: System claims ${recordedStock} units in stock`);
    }

    if (isPromoted && consecutiveZeroSalesDays >= 2) {
      reasons.push(`Active promotion with zero customer sales (failed promotional velocity lift)`);
    }

    if (regularityRatio >= 0.75) {
      reasons.push(`Historical regularity of ${(regularityRatio * 100).toFixed(0)}% (consistently sold almost every day)`);
    } else if (regularityRatio < 0.3) {
      reasons.push(`Naturally low/intermittent demand history (damped to prevent false alarm)`);
    }

    if (isStaleInventory) {
      reasons.push(`Inventory snapshot stale (>4 days old); confidence score adjusted down`);
    }

    if (reasons.length === 0) {
      reasons.push(`Normal demand patterns within standard variance tolerance`);
    }

    // Recommended Physical Verification Action
    let recommendedAction = 'Standard inventory cycle count during routine weekly audit';
    if (finalRiskScore >= 75) {
      if (isPromoted) {
        recommendedAction = 'Urgent: Audit promotional end-cap and primary shelf bay for missing shelf tag or misplaced promo stock';
      } else if (prodInfo.category.includes('Electronics') || latestPrice >= 2500) {
        recommendedAction = 'High Priority: Inspect locked display case and backroom high-value cage for potential shrinkage or theft';
      } else if (recordedStock >= 25) {
        recommendedAction = 'Immediate Audit: Check top-stock overhead risers and backroom staging pallets (stock likely not worked to floor)';
      } else {
        recommendedAction = 'Immediate Shelf Audit: Verify facing width, check adjacent peg hooks, and test barcode scanning';
      }
    } else if (finalRiskScore >= 55) {
      recommendedAction = 'Priority Audit: Floor associate to verify facing on shelf and search adjacent aisles for misplaced items';
    } else if (finalRiskScore >= 35) {
      recommendedAction = 'Visual Inspection: Conduct spot check during next shelf recovery pass';
    }

    // Timeline data for charts
    // Create combined map of dates
    const dateMap = new Map<string, TimelineDataPoint>();
    records.forEach(r => {
      dateMap.set(r.date, {
        date: r.date,
        units_sold: r.units_sold,
        recorded_stock: null,
        is_promoted: promoSet.has(`${r.date}__${storeId}__${sku}`),
        baseline_estimate: Number(baselineSalesAvg.toFixed(1)),
      });
    });

    invRecords.forEach(inv => {
      const existing = dateMap.get(inv.date);
      if (existing) {
        existing.recorded_stock = inv.recorded_stock;
      }
    });

    const dailyTimeline = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Breakdown object
    const breakdown: RiskScoreBreakdown = {
      velocityDropScore: Math.round(velocityDropScore),
      zeroStreakScore: Math.round(zeroStreakScore),
      stockDiscrepancyScore: Math.round(stockDiscrepancyScore),
      promoDiscrepancyScore: Math.round(promoDiscrepancyScore),
      regularityWeight: Number(regularityWeight.toFixed(2)),
      dataConfidence: Number(dataConfidence.toFixed(2)),
      rawCompositeScore: Math.round(rawCompositeScore),
      finalRiskScore,
    };

    // Restore existing verification status from storage if present
    const existing = existingStatuses[key];
    const status = existing ? existing.status : 'pending';
    const userNotes = existing ? existing.notes : undefined;
    const verifiedAt = existing ? existing.verifiedAt : undefined;

    cases.push({
      id: key,
      sku,
      productName: prodInfo.productName,
      category: prodInfo.category,
      storeId,
      storeName: storeInfo.name,
      region: storeInfo.region,
      recordedStock,
      recentSalesAvg: Number(recentSalesAvg.toFixed(2)),
      baselineSalesAvg: Number(baselineSalesAvg.toFixed(2)),
      dropPercent: Number(dropPercent.toFixed(1)),
      consecutiveZeroSalesDays,
      regularityRatio: Number(regularityRatio.toFixed(2)),
      isPromoted,
      unitPrice: latestPrice,
      estimatedLostUnits,
      estimatedSalesAtRisk,
      riskScore: finalRiskScore,
      riskLevel,
      confidenceLevel,
      reasons,
      recommendedAction,
      status,
      userNotes,
      verifiedAt,
      groundTruth: gtMap.get(key),
      dailyTimeline,
      breakdown,
      lastInventoryDate,
      isStaleInventory,
    });
  });

  // Sort primarily by Risk Score descending, secondary by estimated sales at risk
  cases.sort((a, b) => {
    if (b.riskScore !== a.riskScore) {
      return b.riskScore - a.riskScore;
    }
    return b.estimatedSalesAtRisk - a.estimatedSalesAtRisk;
  });

  return cases;
}
