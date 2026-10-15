import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  RotateCcw,
  Store,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { VerificationCase, GroundTruthRecord, EvaluationMetrics } from '../../types';
import { computeEvaluationMetrics } from '../../services/evaluationEngine';

interface EvaluationViewProps {
  cases: VerificationCase[];
  groundTruth: GroundTruthRecord[];
  onLoadDemoGroundTruth: () => void;
  onNavigateToUpload: () => void;
}

export const EvaluationView: React.FC<EvaluationViewProps> = ({
  cases,
  groundTruth,
  onLoadDemoGroundTruth,
  onNavigateToUpload,
}) => {
  const metrics: EvaluationMetrics = computeEvaluationMetrics(cases, groundTruth, 20);

  // Index ground truth for lookup
  const gtMap = new Map<string, { isPhantom: boolean; notes?: string }>();
  groundTruth.forEach(gt => {
    gtMap.set(`${gt.store_id}__${gt.sku}`, { isPhantom: gt.is_phantom_stockout, notes: gt.notes });
  });

  const labelledCases = cases.filter(c => gtMap.has(c.id));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
            <h1 className="text-xl font-bold text-slate-100">
              Ground-Truth Evaluation & Accuracy Benchmarks
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Objective quantitative evaluation against verified physical shelf audits. Never hallucinate accuracy without ground-truth labels.
          </p>
        </div>

        {metrics.hasGroundTruth && (
          <button
            onClick={onLoadDemoGroundTruth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Ground Truth</span>
          </button>
        )}
      </div>

      {/* Honest Empty State if no labels */}
      {!metrics.hasGroundTruth ? (
        <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-4 max-w-2xl mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-100">
              Model Accuracy Cannot Yet Be Measured
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-lg mx-auto">
              No ground-truth physical verification labels were provided in the dataset. In compliance with strict auditing integrity standards, NEXORA does <strong>not</strong> invent or extrapolate benchmark metrics without verified ground-truth records.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={onLoadDemoGroundTruth}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition shadow-lg shadow-teal-500/20"
            >
              Load Benchmark Demo Ground-Truth Set
            </button>
            <button
              onClick={onNavigateToUpload}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              Upload Ground Truth CSV
            </button>
          </div>
        </div>
      ) : (
        /* Ground truth available: show real metrics */
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-teal-500/30">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Precision @ 20
              </div>
              <div className="text-3xl font-extrabold font-mono text-teal-400 mt-1">
                {metrics.precisionAtK}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Top-20 queue accuracy</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Overall Recall
              </div>
              <div className="text-3xl font-extrabold font-mono text-cyan-400 mt-1">
                {metrics.overallRecall}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Labelled phantom cases caught</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Overall Precision
              </div>
              <div className="text-3xl font-extrabold font-mono text-purple-400 mt-1">
                {metrics.overallPrecision}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">TP / (TP + FP)</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                False Positive Rate
              </div>
              <div className="text-3xl font-extrabold font-mono text-rose-400 mt-1">
                {metrics.falsePositiveRate}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">FP / (FP + TN)</div>
            </div>
          </div>

          {/* Confusion Matrix Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Matrix Table */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100">
                  Audit Confusion Matrix
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {metrics.totalLabelledCases} Labelled Pairs
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <div className="text-[10px] font-bold text-emerald-300 uppercase">
                    True Positives (TP)
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    {metrics.truePositives}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Predicted Phantom & Confirmed Empty
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                  <div className="text-[10px] font-bold text-rose-300 uppercase">
                    False Positives (FP)
                  </div>
                  <div className="text-2xl font-bold font-mono text-rose-400">
                    {metrics.falsePositives}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Flagged by Model, but Shelf was OK
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <div className="text-[10px] font-bold text-amber-300 uppercase">
                    False Negatives (FN)
                  </div>
                  <div className="text-2xl font-bold font-mono text-amber-400">
                    {metrics.falseNegatives}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Actual Phantom Missed by Threshold
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
                  <div className="text-[10px] font-bold text-slate-300 uppercase">
                    True Negatives (TN)
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-200">
                    {metrics.trueNegatives}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Correctly Classified as Normal Flow
                  </div>
                </div>
              </div>
            </div>

            {/* Store-by-Store Precision Breakdown */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-100">
                Store-By-Store Evaluation Metrics
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Store Location</th>
                      <th className="py-2.5 px-3 text-right">Labelled</th>
                      <th className="py-2.5 px-3 text-right">Precision</th>
                      <th className="py-2.5 px-3 text-right">Recall</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                    {Object.keys(metrics.storeMetrics).map(stId => {
                      const st = metrics.storeMetrics[stId];
                      return (
                        <tr key={stId}>
                          <td className="py-2 px-3 font-sans font-medium text-slate-200">
                            {st.storeName}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-400">{st.casesCount}</td>
                          <td className="py-2 px-3 text-right font-bold text-teal-400">{st.precision}%</td>
                          <td className="py-2 px-3 text-right font-bold text-cyan-400">{st.recall}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Labelled Cases Comparison Table */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-100">
              Verified Ground-Truth Case Audit Log
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Product / SKU</th>
                    <th className="py-2.5 px-3">Store</th>
                    <th className="py-2.5 px-3 text-center">Model Risk Score</th>
                    <th className="py-2.5 px-3 text-center">Actual Ground Truth</th>
                    <th className="py-2.5 px-3 text-center">Classification</th>
                    <th className="py-2.5 px-3">Audit Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-medium">
                  {labelledCases.map(c => {
                    const labelInfo = gtMap.get(c.id);
                    const isActualPhantom = labelInfo?.isPhantom;
                    const isModelPositive = c.riskScore >= 50;
                    const isHit = isActualPhantom && isModelPositive;
                    const isClean = !isActualPhantom && !isModelPositive;
                    const isFP = !isActualPhantom && isModelPositive;
                    const isFN = isActualPhantom && !isModelPositive;

                    return (
                      <tr key={c.id} className="hover:bg-slate-900/60">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-100">{c.productName}</div>
                          <div className="text-[10px] font-mono text-slate-500">{c.sku}</div>
                        </td>
                        <td className="py-2.5 px-3">{c.storeName}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-teal-400">
                          {c.riskScore}/100
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isActualPhantom
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {isActualPhantom ? 'Phantom Stock-Out' : 'Normal / Shelf OK'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isHit && (
                            <span className="text-emerald-400 font-bold text-xs">✓ Hit (TP)</span>
                          )}
                          {isClean && (
                            <span className="text-slate-400 font-semibold text-xs">✓ Clean (TN)</span>
                          )}
                          {isFP && (
                            <span className="text-rose-400 font-bold text-xs">✗ False Alarm (FP)</span>
                          )}
                          {isFN && (
                            <span className="text-amber-400 font-bold text-xs">✗ Miss (FN)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-[280px] truncate">
                          {labelInfo?.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
