import React from 'react';
import {
  AlertTriangle,
  Package,
  Store,
  IndianRupee,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  TrendingDown,
  Layers,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import { VerificationCase, DatasetState } from '../../types';
import { DailySalesChart, RiskDistributionChart, StoreComparisonChart } from '../common/Charts';
import { formatINR } from '../../utils/currency';

interface DashboardViewProps {
  cases: VerificationCase[];
  dataset: DatasetState;
  onSelectCase: (caseItem: VerificationCase) => void;
  onNavigateToQueue: () => void;
  onNavigateToUpload: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cases,
  dataset,
  onSelectCase,
  onNavigateToQueue,
  onNavigateToUpload,
}) => {
  // Aggregate Metrics
  const uniqueProductsCount = new Set(dataset.sales.map(s => s.sku)).size;
  const storeCount = dataset.stores.length || new Set(dataset.sales.map(s => s.store_id)).size;

  const suspiciousCases = cases.filter(c => c.riskScore >= 35);
  const highPriorityCases = cases.filter(c => c.riskScore >= 55);
  const verifiedCount = cases.filter(c => c.status !== 'pending').length;

  const totalSalesAtRisk = cases.reduce((sum, c) => sum + (c.riskScore >= 35 ? c.estimatedSalesAtRisk : 0), 0);

  // Risk Distribution counts
  const riskDistribution = {
    severe: cases.filter(c => c.riskLevel === 'severe').length,
    high: cases.filter(c => c.riskLevel === 'high').length,
    medium: cases.filter(c => c.riskLevel === 'medium').length,
    low: cases.filter(c => c.riskLevel === 'low').length,
  };

  // Store-wise breakdown
  const storeMap = new Map<string, { storeName: string; suspiciousCount: number; salesAtRisk: number }>();
  cases.forEach(c => {
    if (!storeMap.has(c.storeId)) {
      storeMap.set(c.storeId, { storeName: c.storeName, suspiciousCount: 0, salesAtRisk: 0 });
    }
    if (c.riskScore >= 35) {
      const entry = storeMap.get(c.storeId)!;
      entry.suspiciousCount++;
      entry.salesAtRisk += c.estimatedSalesAtRisk;
    }
  });

  const storeSummaries = Array.from(storeMap.entries()).map(([storeId, val]) => ({
    storeId,
    ...val,
  })).sort((a, b) => b.suspiciousCount - a.suspiciousCount);

  // Aggregate daily sales trend for network
  const dateSalesMap = new Map<string, { units: number; stock: number }>();
  dataset.sales.forEach(s => {
    if (!dateSalesMap.has(s.date)) {
      dateSalesMap.set(s.date, { units: 0, stock: 0 });
    }
    dateSalesMap.get(s.date)!.units += s.units_sold;
  });

  dataset.inventory.forEach(inv => {
    if (dateSalesMap.has(inv.date)) {
      dateSalesMap.get(inv.date)!.stock += inv.recorded_stock;
    }
  });

  const networkTimeline = Array.from(dateSalesMap.entries())
    .map(([date, val]) => ({
      date,
      units_sold: val.units,
      recorded_stock: val.stock > 0 ? val.stock : null,
      is_promoted: false,
      baseline_estimate: 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Compute average network baseline for line
  const avgNetworkSales = networkTimeline.length > 0
    ? networkTimeline.reduce((sum, d) => sum + d.units_sold, 0) / networkTimeline.length
    : 0;

  networkTimeline.forEach(d => {
    d.baseline_estimate = Number(avgNetworkSales.toFixed(0));
  });

  // Top 10 preview for dashboard
  const topPreviewCases = cases.slice(0, 10);

  return (
    <div className="space-y-6 pb-12">
      {/* Notice Banner if Demo Data */}
      {dataset.isDemoData && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <div>
              <div className="text-xs font-bold text-amber-300">
                ACTIVE MODE: SYNTHETIC RETAIL DEMO DATASET
              </div>
              <div className="text-[11px] text-slate-400">
                All metrics, product sales, and risk indicators reflect pre-configured retail hackathon benchmarks.
              </div>
            </div>
          </div>
          <button
            onClick={onNavigateToUpload}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5"
          >
            <span>Upload Real Store CSVs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: SKUs */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-300">Unique SKUs</span>
            <Package className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-100 mt-2">
            {uniqueProductsCount}
          </div>
          <div className="text-[10px] text-slate-300 mt-1">Catalog items tracked</div>
        </div>

        {/* Card 2: Stores */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-300">Store Network</span>
            <Store className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-100 mt-2">
            {storeCount}
          </div>
          <div className="text-[10px] text-slate-300 mt-1">Active retail locations</div>
        </div>

        {/* Card 3: Suspicious Combinations */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-300">Suspicious Pairs</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-400 mt-2">
            {suspiciousCases.length}
          </div>
          <div className="text-[10px] text-slate-300 mt-1">Risk score ≥ 35</div>
        </div>

        {/* Card 4: High Priority Cases */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-rose-500/20 shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-rose-300">High Priority</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-400 mt-2">
            {highPriorityCases.length}
          </div>
          <div className="text-[10px] text-slate-300 mt-1">Critical shelf audits</div>
        </div>

        {/* Card 5: Verified Cases */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-300">Verified Audits</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
            {verifiedCount} <span className="text-xs font-normal text-slate-400">/ {cases.length}</span>
          </div>
          <div className="text-[10px] text-slate-300 mt-1">Associate resolutions</div>
        </div>

        {/* Card 6: Sales At Risk */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-teal-500/20 shadow-sm relative overflow-hidden group hover:border-teal-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-teal-300">Sales At Risk</span>
            <IndianRupee className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-teal-300 mt-2">
            {formatINR(totalSalesAtRisk)}
          </div>
          <div className="text-[10px] text-slate-300 mt-1">Unrealized demand</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Network Sales Trend Chart (Span 2) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Aggregate Network Daily Sales Velocity</span>
                {dataset.isDemoData && (
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/30">
                    DEMO DATA
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Total units sold daily across monitored SKU-store combinations
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-teal-400 font-bold">
                {networkTimeline.length} Days Monitored
              </span>
            </div>
          </div>

          <DailySalesChart timeline={networkTimeline} height={200} showStock={false} />
        </div>

        {/* Risk Distribution Chart (Span 1) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-md space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Phantom Anomaly Distribution
            </h3>
            <p className="text-xs text-slate-400">
              Breakdown of all {cases.length} SKU-store combinations
            </p>
          </div>

          <RiskDistributionChart distribution={riskDistribution} />

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <span className="text-rose-400 font-semibold">Severe Risk (≥75):</span> Immediate floor audit required before end-of-shift to prevent lost basket sales.
          </div>
        </div>
      </div>

      {/* Second Row: Store-wise Comparison + Recent Alert Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Store Comparison */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Store-Wise Anomaly Distribution
              </h3>
              <p className="text-xs text-slate-400">
                Stores ranked by number of suspected phantom stock-outs
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {storeSummaries.length} Locations
            </span>
          </div>

          <StoreComparisonChart stores={storeSummaries} />
        </div>

        {/* High Priority Alerts Feed */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Top Critical Phantom Alerts</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              </h3>
              <p className="text-xs text-slate-400">
                Urgent product-store pairs needing immediate physical verification
              </p>
            </div>
            <button
              onClick={onNavigateToQueue}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
            >
              <span>View All ({cases.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {highPriorityCases.slice(0, 4).map(c => (
              <div
                key={c.id}
                onClick={() => onSelectCase(c)}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center justify-between group"
              >
                <div className="space-y-1 max-w-[70%]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                      Score: {c.riskScore}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-teal-300 transition">
                      {c.productName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate flex items-center gap-2">
                    <span>{c.storeName}</span>
                    <span>•</span>
                    <span className="text-purple-400 font-mono">Stock: {c.recordedStock}</span>
                    <span>•</span>
                    <span className="text-rose-400 font-mono">Drop: -{c.dropPercent.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-teal-400">
                    {formatINR(c.estimatedSalesAtRisk)}
                  </div>
                  <div className="text-[10px] text-slate-500">at risk</div>
                </div>
              </div>
            ))}

            {highPriorityCases.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500">
                No high-priority phantom stock-outs detected in the current window.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top 20 Verification Queue Preview Table */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-md space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Top Verification Queue (Ranked Preview)</span>
              <span className="text-xs font-normal text-slate-400 font-mono">
                Showing top 10 of {cases.length} cases
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Ranked by deterministic phantom risk score and unrealized sales impact
            </p>
          </div>

          <button
            onClick={onNavigateToQueue}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-teal-500/20"
          >
            <span>Open Full Verification Queue</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">Rank</th>
                <th className="py-3 px-3">Product / SKU</th>
                <th className="py-3 px-3">Store</th>
                <th className="py-3 px-3 text-right">Recorded Stock</th>
                <th className="py-3 px-3 text-right">Recent vs Baseline</th>
                <th className="py-3 px-3 text-center">Risk Score</th>
                <th className="py-3 px-3 text-right">Sales At Risk (₹)</th>
                <th className="py-3 px-3">Verification Action</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300 font-medium">
              {topPreviewCases.map((c, idx) => (
                <tr
                  key={c.id}
                  onClick={() => onSelectCase(c)}
                  className="hover:bg-slate-900/60 transition cursor-pointer group"
                >
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                    #{idx + 1}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-100 group-hover:text-teal-300 transition">
                      {c.productName}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {c.sku} • {c.category}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-slate-200">{c.storeName}</div>
                    <div className="text-[10px] text-slate-500">{c.region}</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-purple-300 font-bold">
                    {c.recordedStock} u
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[11px]">
                    <span className="text-rose-400 font-semibold">{c.recentSalesAvg}</span>
                    <span className="text-slate-500"> / </span>
                    <span className="text-slate-400">{c.baselineSalesAvg} u/d</span>
                    <div className="text-[10px] text-rose-400">-{c.dropPercent.toFixed(0)}% drop</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                        c.riskLevel === 'severe'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : c.riskLevel === 'high'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : c.riskLevel === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {c.riskScore}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-teal-300 font-bold">
                    {formatINR(c.estimatedSalesAtRisk, true)}
                  </td>
                  <td className="py-3 px-3 max-w-[200px] truncate text-[11px] text-slate-400">
                    {c.recommendedAction}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        c.status === 'verified_stockout'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : c.status === 'false_alarm'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : c.status === 'needs_recheck'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {c.status === 'verified_stockout'
                        ? 'Confirmed'
                        : c.status === 'false_alarm'
                        ? 'False Alarm'
                        : c.status === 'needs_recheck'
                        ? 'Recheck'
                        : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
