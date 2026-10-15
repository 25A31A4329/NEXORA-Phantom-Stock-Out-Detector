import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Sparkles,
  BarChart3,
  TrendingDown,
  Package,
  Layers,
  Store,
  IndianRupee,
  Calendar,
  Compass,
  FileText,
  Info,
} from 'lucide-react';
import { VerificationCase, VerificationStatus } from '../../types';
import { DailySalesChart } from '../common/Charts';
import { formatINR } from '../../utils/currency';

interface CaseDetailModalProps {
  caseItem: VerificationCase | null;
  onClose: () => void;
  onUpdateStatus: (caseId: string, status: VerificationStatus, notes: string) => void;
  hasGeminiKey: boolean;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  caseItem,
  onClose,
  onUpdateStatus,
  hasGeminiKey,
}) => {
  if (!caseItem) return null;

  const [selectedStatus, setSelectedStatus] = useState<VerificationStatus>(caseItem.status);
  const [notes, setNotes] = useState<string>(caseItem.userNotes || '');
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleSave = () => {
    onUpdateStatus(caseItem.id, selectedStatus, notes);
    onClose();
  };

  const handleFetchAiAudit = async () => {
    setIsLoadingAi(true);
    setAiError(null);
    try {
      const res = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseData: caseItem }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI explanation');
      }
      setAiExplanation(data.explanation);
    } catch (err: any) {
      console.warn('AI explanation error:', err);
      setAiError(err.message || 'Gemini API call failed');
      // Provide deterministic fallback synthesis
      setAiExplanation(
        `**Deterministic Operational Field Memo:**\n\n` +
        `1. **Root-Cause Hypothesis**: High probability of secondary display misplacement or backroom pallet delay. System shows ${caseItem.recordedStock} units on hand with ${caseItem.consecutiveZeroSalesDays} consecutive days of zero movement.\n` +
        `2. **Floor Verification Protocol**: Floor associate must inspect primary planogram facing, check top-stock overhead risers, and scan barcode tag for price label defects.\n` +
        `3. **Commercial Risk**: Lost estimated velocity is ${caseItem.baselineSalesAvg} units/day (${formatINR(caseItem.estimatedSalesAtRisk, true)} total sales at risk). Immediate shelf audit recommended.`
      );
    } finally {
      setIsLoadingAi(false);
    }
  };

  const getRiskBadge = () => {
    switch (caseItem.riskLevel) {
      case 'severe':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getRiskBadge()}`}>
                {caseItem.riskLevel} Risk • {caseItem.riskScore}/100
              </span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                {caseItem.sku}
              </span>
              <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                {caseItem.category}
              </span>
              {caseItem.isPromoted && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  PROMO ACTIVE
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              {caseItem.productName}
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-0.5">
              <span className="flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-slate-500" />
                {caseItem.storeName} ({caseItem.region})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono">
                <IndianRupee className="w-3.5 h-3.5 text-teal-400" />
                {formatINR(caseItem.unitPrice, true)} retail
              </span>
              <span>•</span>
              <span className="text-slate-400 font-mono">
                Confidence: <strong className="text-slate-200">{caseItem.confidenceLevel}%</strong>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
                Recorded Stock
              </div>
              <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
                {caseItem.recordedStock} <span className="text-xs font-normal text-slate-400">units</span>
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                {caseItem.isStaleInventory ? '⚠️ Stale inventory snapshot' : 'Active system balance'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
                Velocity Drop
              </div>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                -{caseItem.dropPercent.toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                {caseItem.recentSalesAvg} vs {caseItem.baselineSalesAvg} u/d base
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
                Zero Sales Streak
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {caseItem.consecutiveZeroSalesDays} <span className="text-xs font-normal text-slate-400">days</span>
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                Consecutive zero movement
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
                Est. Sales At Risk
              </div>
              <div className="text-2xl font-bold font-mono text-teal-400 mt-1">
                {formatINR(caseItem.estimatedSalesAtRisk, true)}
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                ~{caseItem.estimatedLostUnits} units unserved demand
              </div>
            </div>
          </div>

          {/* Interactive Timeline Chart */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-slate-200">
                  Sales Velocity & Recorded Inventory Timeline
                </h3>
              </div>
              <span className="text-xs text-slate-300">
                35-Day Observation Window
              </span>
            </div>
            <DailySalesChart timeline={caseItem.dailyTimeline} height={190} showStock={true} />
          </div>

          {/* Explainability & Components Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Why Flagged */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Detection Drivers & Explainability</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {caseItem.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>
                  Historical Regularity: <strong>{(caseItem.regularityRatio * 100).toFixed(0)}%</strong> active sales days.
                </span>
              </div>
            </div>

            {/* Score Component Breakdown */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-sm font-bold text-slate-200">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-teal-400" />
                  <span>Risk Component Breakdown</span>
                </div>
                <span className="font-mono text-teal-400 text-xs font-semibold">
                  Composite: {caseItem.breakdown.finalRiskScore}/100
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Velocity Drop Severity</span>
                    <span className="font-mono text-slate-200">{caseItem.breakdown.velocityDropScore}/100</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${caseItem.breakdown.velocityDropScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Zero Sales Streak Penalty</span>
                    <span className="font-mono text-slate-200">{caseItem.breakdown.zeroStreakScore}/100</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${caseItem.breakdown.zeroStreakScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Positive Stock Discrepancy Index</span>
                    <span className="font-mono text-slate-200">{caseItem.breakdown.stockDiscrepancyScore}/100</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${caseItem.breakdown.stockDiscrepancyScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Promotion Discrepancy Lift</span>
                    <span className="font-mono text-slate-200">{caseItem.breakdown.promoDiscrepancyScore}/100</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full"
                      style={{ width: `${caseItem.breakdown.promoDiscrepancyScore}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px] text-slate-400">
                  <span>Regularity Multiplier: <strong>{caseItem.breakdown.regularityWeight}x</strong></span>
                  <span>Data Quality: <strong>{(caseItem.breakdown.dataConfidence * 100).toFixed(0)}%</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommended Floor Action */}
          <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-500/30 space-y-2">
            <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider">
              <Compass className="w-4 h-4 text-teal-400" />
              <span>Recommended Floor Verification Protocol</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {caseItem.recommendedAction}
            </p>
          </div>

          {/* Optional Gemini AI Audit Section */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  AI Deep Audit Analysis
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                  Gemini 3.8 Flash
                </span>
              </div>

              {!aiExplanation && (
                <button
                  onClick={handleFetchAiAudit}
                  disabled={isLoadingAi}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
                >
                  {isLoadingAi ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate AI Operational Assessment
                    </>
                  )}
                </button>
              )}
            </div>

            {aiExplanation && (
              <div className="p-3.5 rounded-lg bg-purple-950/20 border border-purple-500/20 text-xs text-purple-100 leading-relaxed whitespace-pre-line">
                {aiExplanation}
              </div>
            )}
            {!aiExplanation && !isLoadingAi && (
              <p className="text-[11px] text-slate-400">
                Click to synthesize an operational field memo covering root-cause hypothesis, floor audit sequence, and revenue risk.
              </p>
            )}
          </div>

          {/* Verification Decision Form */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-700/80 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" />
              <span>Record Associate Verification Decision</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStatus('verified_stockout')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition ${
                  selectedStatus === 'verified_stockout'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-200 ring-1 ring-rose-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-rose-300">Confirmed Phantom</div>
                  <div className="text-[10px] text-slate-400">Shelf was actually empty</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('false_alarm')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition ${
                  selectedStatus === 'false_alarm'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <XCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-emerald-300">False Alarm</div>
                  <div className="text-[10px] text-slate-400">Product found on shelf</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('needs_recheck')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition ${
                  selectedStatus === 'needs_recheck'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-amber-300">Needs Recheck</div>
                  <div className="text-[10px] text-slate-400">Audit backroom pallet</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('pending')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition ${
                  selectedStatus === 'pending'
                    ? 'bg-slate-800 border-slate-600 text-slate-200 ring-1 ring-slate-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center text-[10px] shrink-0">
                  ?
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-300">Pending Audit</div>
                  <div className="text-[10px] text-slate-400">Keep in active queue</div>
                </div>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Auditor Notes & Root Cause Details:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Found 12 units on top riser unworked; inventory tag barcode was damaged; pallet located in receiving dock..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Saved locally in browser storage</span>
              {caseItem.verifiedAt && (
                <span>Last updated: {new Date(caseItem.verifiedAt).toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Current Case: <span className="font-mono text-slate-300">{caseItem.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition shadow-lg shadow-teal-500/20"
            >
              Save Verification Decision
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
