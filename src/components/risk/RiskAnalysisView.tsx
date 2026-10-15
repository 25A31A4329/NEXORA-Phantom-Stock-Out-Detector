import React, { useState } from 'react';
import {
  SlidersHorizontal,
  RotateCcw,
  BookOpen,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  Check,
  Info,
} from 'lucide-react';
import { DetectionWeights } from '../../types';
import { DEFAULT_DETECTION_WEIGHTS } from '../../services/detectionEngine';

interface RiskAnalysisViewProps {
  weights: DetectionWeights;
  onUpdateWeights: (newWeights: DetectionWeights) => void;
  totalCasesCount: number;
  severeCount: number;
}

export const RiskAnalysisView: React.FC<RiskAnalysisViewProps> = ({
  weights,
  onUpdateWeights,
  totalCasesCount,
  severeCount,
}) => {
  const [localWeights, setLocalWeights] = useState<DetectionWeights>(weights);
  const [savedNotification, setSavedNotification] = useState(false);

  const handleSliderChange = (field: keyof DetectionWeights, value: number) => {
    setLocalWeights(prev => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onUpdateWeights(localWeights);
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2500);
  };

  const handleReset = () => {
    setLocalWeights(DEFAULT_DETECTION_WEIGHTS);
    onUpdateWeights(DEFAULT_DETECTION_WEIGHTS);
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2500);
  };

  const totalWeight =
    localWeights.velocityDropWeight +
    localWeights.zeroStreakWeight +
    localWeights.stockDiscrepancyWeight +
    localWeights.promoDiscrepancyWeight;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-teal-400" />
            <h1 className="text-xl font-bold text-slate-100">
              Risk Algorithm Architecture & Scoring Weights
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure component weights for the deterministic detection engine and inspect mathematical formulations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition shadow-lg shadow-teal-500/20"
          >
            <Check className="w-4 h-4" />
            <span>Apply Weights & Recalculate</span>
          </button>
        </div>
      </div>

      {savedNotification && (
        <div className="p-3 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-200 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Weights updated! All {totalCasesCount} SKU-store combinations recalculated.</span>
        </div>
      )}

      {/* Interactive Sliders Card */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Modular Component Weights
            </h2>
            <p className="text-xs text-slate-400">
              Adjust relative contribution of each detection feature to the composite risk score.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            Normalized Sum: <strong className="text-teal-400">{totalWeight.toFixed(2)}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slider 1: Velocity Drop */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">1. Sales Velocity Collapse Weight</span>
              <span className="font-mono text-teal-400 font-bold">
                {((localWeights.velocityDropWeight / totalWeight) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={localWeights.velocityDropWeight}
              onChange={(e) => handleSliderChange('velocityDropWeight', parseFloat(e.target.value))}
              className="w-full accent-teal-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Measures percentage decline in 7-day velocity relative to 28-day historical baseline.
            </p>
          </div>

          {/* Slider 2: Zero Sales Streak */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">2. Consecutive Zero-Sales Days Weight</span>
              <span className="font-mono text-amber-400 font-bold">
                {((localWeights.zeroStreakWeight / totalWeight) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={localWeights.zeroStreakWeight}
              onChange={(e) => handleSliderChange('zeroStreakWeight', parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Penalizes uninterrupted streaks of zero units sold on items that sell regularly.
            </p>
          </div>

          {/* Slider 3: Stock Discrepancy */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">3. Positive Stock Discrepancy Weight</span>
              <span className="font-mono text-purple-400 font-bold">
                {((localWeights.stockDiscrepancyWeight / totalWeight) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={localWeights.stockDiscrepancyWeight}
              onChange={(e) => handleSliderChange('stockDiscrepancyWeight', parseFloat(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Amplifies risk when recorded inventory is positive or high, signaling ghost stock.
            </p>
          </div>

          {/* Slider 4: Promo Discrepancy */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">4. Promotion Lift Discrepancy Weight</span>
              <span className="font-mono text-yellow-400 font-bold">
                {((localWeights.promoDiscrepancyWeight / totalWeight) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={localWeights.promoDiscrepancyWeight}
              onChange={(e) => handleSliderChange('promoDiscrepancyWeight', parseFloat(e.target.value))}
              className="w-full accent-yellow-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Surges risk score when an active marketing promotion fails to generate expected lift.
            </p>
          </div>
        </div>
      </div>

      {/* Algorithm Formulation Documentation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Formula breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Mathematical Scoring Formulation
            </h3>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
            <div className="text-teal-400 font-semibold">// Composite Risk Formula</div>
            <div>RiskScore = RawComposite × IntermittencyDamper × StockFlag</div>
            <div className="text-slate-500 pt-1">// Where:</div>
            <div className="text-slate-400">
              RawComposite = w₁·S_drop + w₂·S_zero + w₃·S_stock + w₄·S_promo
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div>
              <strong className="text-teal-300">Intermittency & Regularity Damper (Crucial):</strong>
              <p className="text-slate-400 mt-0.5">
                Slow-moving items (e.g. specialty oils with historical baseline &lt; 0.6 units/day) are penalized with a 0.15x dampener. This avoids falsely reporting intermittent Poisson demand as a phantom stock-out.
              </p>
            </div>

            <div>
              <strong className="text-purple-300">True Stock-Out vs Phantom Stock-Out:</strong>
              <p className="text-slate-400 mt-0.5">
                If recorded inventory is 0, the system already knows the item is out of stock. Phantom stock-out only occurs when recorded inventory is positive (&gt;0) yet customers cannot purchase.
              </p>
            </div>

            <div>
              <strong className="text-amber-300">Data Freshness & Confidence Multiplier:</strong>
              <p className="text-slate-400 mt-0.5">
                When inventory snapshots are older than 4 days or baseline observation depth is under 14 days, confidence score is discounted by 25%.
              </p>
            </div>
          </div>
        </div>

        {/* Business Impact Formulation */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Business Impact & Sales At Risk Modeling
            </h3>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
            <div className="text-teal-400 font-semibold">// Unrealized Demand Formula</div>
            <div>MissedDailyDemand = max(0, BaselineSalesAvg - RecentSalesAvg)</div>
            <div>LostUnits = MissedDailyDemand × AffectedDays</div>
            <div className="text-teal-300 font-bold">SalesAtRisk (₹) = LostUnits × UnitRetailPrice (₹)</div>
          </div>

          <div className="space-y-2.5 text-xs text-slate-400 leading-relaxed">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <strong className="font-semibold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Uncertainty & Verification Caveats
              </strong>
              Sales at risk represents <em>estimated unrealized demand</em>. It must not be reported to executives as guaranteed recovered margin or confirmed theft. Physical audit is mandatory.
            </div>

            <p>
              <strong>Assumptions:</strong> Baseline demand assumes steady-state velocity. Seasonality and competitor promotions are assumed neutral unless captured in the promotion calendar file.
            </p>
            <p>
              <strong>Affected Days:</strong> Bounded by the streak of consecutive zero sales days (minimum 1, maximum 7).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
