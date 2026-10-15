import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  Store,
  Layers,
  Database,
  SlidersHorizontal,
} from 'lucide-react';
import { VerificationCase, VerificationStatus, RiskLevel } from '../../types';
import { formatINR } from '../../utils/currency';

interface VerificationQueueViewProps {
  cases: VerificationCase[];
  onSelectCase: (caseItem: VerificationCase) => void;
  onQuickUpdateStatus: (caseId: string, status: VerificationStatus) => void;
  onExportCsv: (filteredCases: VerificationCase[]) => void;
}

export const VerificationQueueView: React.FC<VerificationQueueViewProps> = ({
  cases,
  onSelectCase,
  onQuickUpdateStatus,
  onExportCsv,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [limitMode, setLimitMode] = useState<'top20_network' | 'top20_per_store' | 'all'>('top20_network');
  const [sortBy, setSortBy] = useState<'risk' | 'sales_at_risk' | 'drop' | 'stock' | 'zero_streak'>('risk');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Extract unique stores for filter dropdown
  const storeOptions = useMemo(() => {
    const map = new Map<string, string>();
    cases.forEach(c => map.set(c.storeId, c.storeName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [cases]);

  // Filter & Sort
  const processedCases = useMemo(() => {
    let result = [...cases];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        c =>
          c.sku.toLowerCase().includes(q) ||
          c.productName.toLowerCase().includes(q) ||
          c.storeName.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      );
    }

    // Store filter
    if (selectedStore !== 'all') {
      result = result.filter(c => c.storeId === selectedStore);
    }

    // Risk Level filter
    if (selectedRisk !== 'all') {
      result = result.filter(c => c.riskLevel === selectedRisk);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      result = result.filter(c => c.status === selectedStatus);
    }

    // Sort
    result.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortBy === 'risk') {
        valA = a.riskScore;
        valB = b.riskScore;
      } else if (sortBy === 'sales_at_risk') {
        valA = a.estimatedSalesAtRisk;
        valB = b.estimatedSalesAtRisk;
      } else if (sortBy === 'drop') {
        valA = a.dropPercent;
        valB = b.dropPercent;
      } else if (sortBy === 'stock') {
        valA = a.recordedStock;
        valB = b.recordedStock;
      } else if (sortBy === 'zero_streak') {
        valA = a.consecutiveZeroSalesDays;
        valB = b.consecutiveZeroSalesDays;
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    // Verification Limit Mode
    if (limitMode === 'top20_network') {
      result = result.slice(0, 20);
    } else if (limitMode === 'top20_per_store') {
      // Top 20 per store-day grouping
      const groupedByStore = new Map<string, VerificationCase[]>();
      result.forEach(c => {
        if (!groupedByStore.has(c.storeId)) groupedByStore.set(c.storeId, []);
        const list = groupedByStore.get(c.storeId)!;
        if (list.length < 20) {
          list.push(c);
        }
      });
      result = Array.from(groupedByStore.values()).flat();
      // Re-sort combined list
      result.sort((a, b) => (sortOrder === 'desc' ? b.riskScore - a.riskScore : a.riskScore - b.riskScore));
    }

    return result;
  }, [cases, searchQuery, selectedStore, selectedRisk, selectedStatus, limitMode, sortBy, sortOrder]);

  const verifiedCount = cases.filter(c => c.status !== 'pending').length;

  return (
    <div className="space-y-5 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-teal-400" />
            <h1 className="text-xl font-bold text-slate-100">
              Phantom Stock-Out Verification Queue
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Ranked product-store candidates prioritized for physical floor audit. Suspected cases require shelf confirmation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onExportCsv(processedCases)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export Queue CSV ({processedCases.length})</span>
          </button>
        </div>
      </div>

      {/* Persistence Notification Bar */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Database className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            <strong>Storage Architecture:</strong> Associate verification decisions & audit notes are persisted <strong>locally in browser storage</strong>.
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <span>Total Audits Completed: <strong className="text-emerald-400">{verifiedCount}</strong> / {cases.length}</span>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SKU, product name, or store..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
            />
          </div>

          {/* Store Filter */}
          <div>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-200 focus:outline-none focus:border-teal-500 transition"
            >
              <option value="all">All Stores ({storeOptions.length})</option>
              {storeOptions.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Filter */}
          <div>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-200 focus:outline-none focus:border-teal-500 transition"
            >
              <option value="all">All Risk Levels</option>
              <option value="severe">Severe Risk (≥75)</option>
              <option value="high">High Priority (55-74)</option>
              <option value="medium">Medium Risk (35-54)</option>
              <option value="low">Low Risk (&lt;35)</option>
            </select>
          </div>
        </div>

        {/* Secondary controls row */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-2.5 py-1 rounded-md transition ${selectedStatus === 'all' ? 'bg-slate-800 text-slate-100 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All Cases
              </button>
              <button
                onClick={() => setSelectedStatus('pending')}
                className={`px-2.5 py-1 rounded-md transition ${selectedStatus === 'pending' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setSelectedStatus('verified_stockout')}
                className={`px-2.5 py-1 rounded-md transition ${selectedStatus === 'verified_stockout' ? 'bg-rose-500/20 text-rose-300 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Confirmed
              </button>
              <button
                onClick={() => setSelectedStatus('false_alarm')}
                className={`px-2.5 py-1 rounded-md transition ${selectedStatus === 'false_alarm' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                False Alarms
              </button>
              <button
                onClick={() => setSelectedStatus('needs_recheck')}
                className={`px-2.5 py-1 rounded-md transition ${selectedStatus === 'needs_recheck' ? 'bg-yellow-500/20 text-yellow-300 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Rechecks
              </button>
            </div>

            {/* Configurable Queue Limit */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Audit Limit:</span>
              <select
                value={limitMode}
                onChange={(e) => setLimitMode(e.target.value as any)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-200 focus:outline-none"
              >
                <option value="top20_network">Top 20 Network-wide</option>
                <option value="top20_per_store">Top 20 per Store-Day</option>
                <option value="all">All Filtered ({cases.length})</option>
              </select>
            </div>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-200 focus:outline-none"
            >
              <option value="risk">Risk Score</option>
              <option value="sales_at_risk">Sales At Risk (₹)</option>
              <option value="drop">Velocity Drop %</option>
              <option value="zero_streak">Zero Sales Streak</option>
              <option value="stock">Recorded Stock</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Queue Data Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <span>
            Displaying <strong className="text-slate-200 font-mono">{processedCases.length}</strong> prioritized candidates
          </span>
          <span className="text-[11px] text-slate-500">
            Click any row to open interactive timeline, component breakdown & AI audit memo
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">Rank</th>
                <th className="py-3 px-3">Product / SKU</th>
                <th className="py-3 px-3">Store Location</th>
                <th className="py-3 px-3 text-right">System Stock</th>
                <th className="py-3 px-3 text-right">Recent Velocity</th>
                <th className="py-3 px-3 text-right">Baseline Demand</th>
                <th className="py-3 px-3 text-center">Risk Score</th>
                <th className="py-3 px-3 text-center">Confidence</th>
                <th className="py-3 px-3 text-right">Sales At Risk (₹)</th>
                <th className="py-3 px-3">Top Reason</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300 font-medium">
              {processedCases.map((c, idx) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-800/50 transition cursor-pointer group"
                >
                  {/* Rank */}
                  <td
                    onClick={() => onSelectCase(c)}
                    className="py-3 px-3 text-center font-mono font-bold text-slate-300"
                  >
                    #{idx + 1}
                  </td>

                  {/* SKU & Product */}
                  <td onClick={() => onSelectCase(c)} className="py-3 px-3">
                    <div className="font-semibold text-slate-100 group-hover:text-teal-300 transition flex items-center gap-1.5">
                      <span>{c.productName}</span>
                      {c.isPromoted && (
                        <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          PROMO
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {c.sku} • {c.category}
                    </div>
                  </td>

                  {/* Store */}
                  <td onClick={() => onSelectCase(c)} className="py-3 px-3">
                    <div className="text-slate-200">{c.storeName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{c.region}</div>
                  </td>

                  {/* Recorded Stock */}
                  <td onClick={() => onSelectCase(c)} className="py-3 px-3 text-right font-mono font-bold text-purple-300">
                    {c.recordedStock} u
                    {c.isStaleInventory && (
                      <span className="block text-[9px] text-amber-400 font-normal">stale count</span>
                    )}
                  </td>

                  {/* Recent sales */}
                  <td onClick={() => onSelectCase(c)} className="py-3 px-3 text-right font-mono text-rose-400 font-bold">
                    {c.recentSalesAvg} u/d
                    <div className="text-[9px] text-rose-400 font-normal">
                      -{c.dropPercent.toFixed(0)}% drop
                    </div>
                  </td>

                  {/* Baseline */}
                  <td onClick={() => onSelectCase(c)} className="py-3 px-3 text-right font-mono text-slate-400">
                    {c.baselineSalesAvg} u/d
                    <div className="text-[9px] text-slate-500">
                      {(c.regularityRatio * 100).toFixed(0)}% reg.
                    </div>
                  </td>

                  {/* Risk Score */}
                  <td onClick={() => onSelectCase(c)} className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                        c.riskLevel === 'severe'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 ring-1 ring-rose-500/30'
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

                  {/* Confidence */}
                  <td onClick={() => onSelectCase(c)} className="py-3 px-3 text-center font-mono text-[11px] text-slate-400">
                    {c.confidenceLevel}%
                  </td>

                  {/* Sales at risk */}
                  <td onClick={() => onSelectCase(c)} className="py-3 px-3 text-right font-mono font-bold text-teal-300">
                    {formatINR(c.estimatedSalesAtRisk, true)}
                  </td>

                  {/* Main Reason */}
                  <td onClick={() => onSelectCase(c)} className="py-3 px-3 max-w-[210px] truncate text-[11px] text-slate-400">
                    {c.reasons[0] || 'Velocity anomaly'}
                  </td>

                  {/* Status */}
                  <td onClick={() => onSelectCase(c)} className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
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

                  {/* Quick Action buttons */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickUpdateStatus(c.id, 'verified_stockout');
                        }}
                        title="Quick Mark: Confirmed Phantom Stock-Out"
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickUpdateStatus(c.id, 'false_alarm');
                        }}
                        title="Quick Mark: False Alarm (Stock on shelf)"
                        className="p-1 rounded hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCase(c);
                        }}
                        title="View Full Case Audit"
                        className="p-1 rounded hover:bg-teal-500/20 text-slate-500 hover:text-teal-400 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {processedCases.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-xs text-slate-500">
                    No matching cases found for the selected filter parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
