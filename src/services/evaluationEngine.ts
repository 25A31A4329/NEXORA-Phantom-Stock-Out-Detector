import { VerificationCase, GroundTruthRecord, EvaluationMetrics } from '../types';

/**
 * Compute objective evaluation metrics when ground-truth labels exist.
 * If ground truth is empty or missing, clearly return hasGroundTruth: false
 * with zero hallucinated accuracy percentages.
 */
export function computeEvaluationMetrics(
  rankedCases: VerificationCase[],
  groundTruthList: GroundTruthRecord[],
  k: number = 20
): EvaluationMetrics {
  if (!groundTruthList || groundTruthList.length === 0) {
    return {
      hasGroundTruth: false,
      totalLabelledCases: 0,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      trueNegatives: 0,
      precisionAtK: 0,
      overallPrecision: 0,
      overallRecall: 0,
      falsePositiveRate: 0,
      kValue: k,
      storeMetrics: {},
    };
  }

  // Create lookup for ground truth: key -> is_phantom
  const gtLookup = new Map<string, boolean>();
  groundTruthList.forEach(gt => {
    gtLookup.set(`${gt.store_id}__${gt.sku}`, gt.is_phantom_stockout);
  });

  // Calculate Precision @ K (top K cases in verification queue)
  const topKCases = rankedCases.slice(0, k);
  let topKLabelled = 0;
  let topKTruePositives = 0;

  topKCases.forEach(c => {
    if (gtLookup.has(c.id)) {
      topKLabelled++;
      if (gtLookup.get(c.id) === true) {
        topKTruePositives++;
      }
    }
  });

  const precisionAtK = topKLabelled > 0 ? (topKTruePositives / topKLabelled) : 0;

  // Global confusion matrix over all cases with ground truth
  // Positive condition: Ground Truth says true (actual phantom stock-out)
  // Negative condition: Ground Truth says false (actual normal/shelf ok)
  // Model prediction: flagged as severe/high/medium risk (riskScore >= 35) or Top K
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;

  const storeAccumulator: Record<string, { storeName: string; tp: number; fp: number; fn: number; tn: number; count: number }> = {};

  rankedCases.forEach(c => {
    if (gtLookup.has(c.id)) {
      const actualPositive = gtLookup.get(c.id) === true;
      // Model flags case if riskScore >= 50
      const predictedPositive = c.riskScore >= 50;

      if (!storeAccumulator[c.storeId]) {
        storeAccumulator[c.storeId] = {
          storeName: c.storeName,
          tp: 0, fp: 0, fn: 0, tn: 0, count: 0
        };
      }
      storeAccumulator[c.storeId].count++;

      if (actualPositive && predictedPositive) {
        tp++;
        storeAccumulator[c.storeId].tp++;
      } else if (!actualPositive && predictedPositive) {
        fp++;
        storeAccumulator[c.storeId].fp++;
      } else if (actualPositive && !predictedPositive) {
        fn++;
        storeAccumulator[c.storeId].fn++;
      } else {
        tn++;
        storeAccumulator[c.storeId].tn++;
      }
    }
  });

  const totalLabelled = tp + fp + fn + tn;
  const overallPrecision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const overallRecall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const falsePositiveRate = (fp + tn) > 0 ? fp / (fp + tn) : 0;

  const storeMetrics: Record<string, { storeName: string; precision: number; recall: number; casesCount: number }> = {};
  Object.keys(storeAccumulator).forEach(storeId => {
    const s = storeAccumulator[storeId];
    const sPrec = (s.tp + s.fp) > 0 ? s.tp / (s.tp + s.fp) : 0;
    const sRec = (s.tp + s.fn) > 0 ? s.tp / (s.tp + s.fn) : 0;
    storeMetrics[storeId] = {
      storeName: s.storeName,
      precision: Math.round(sPrec * 100),
      recall: Math.round(sRec * 100),
      casesCount: s.count,
    };
  });

  return {
    hasGroundTruth: true,
    totalLabelledCases: totalLabelled,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    trueNegatives: tn,
    precisionAtK: Math.round(precisionAtK * 1000) / 10, // e.g. 88.9%
    overallPrecision: Math.round(overallPrecision * 1000) / 10,
    overallRecall: Math.round(overallRecall * 1000) / 10,
    falsePositiveRate: Math.round(falsePositiveRate * 1000) / 10,
    kValue: k,
    storeMetrics,
  };
}
