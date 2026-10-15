import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Search,
  Store,
  IndianRupee,
  Package,
  Calendar,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
} from 'lucide-react';
import { VerificationCase, DatasetState } from '../../types';
import { formatINR } from '../../utils/currency';

interface InventoryExplorerViewProps {
  cases: VerificationCase[];
  dataset: DatasetState;
  onSelectCase: (caseItem: VerificationCase) => void;
}

export const InventoryExplorerView: React.FC<InventoryExplorerViewProps> = ({
  cases,
  dataset,
  onSelectCase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<'all' | 'phantom' | 'stale' | 'healthy' | 'zero_stock'>('all');

  const categories = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => set.add(c.category));
    return Array.from(set).sort();
  }, [cases]);

  const stores = useMemo(() => {
    const map = new Map<string, string>();
    cases.forEach(c => map.set(c.storeId, c.storeName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [cases]);

  const filteredItems = useMemo(() => {
    return cases.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          c.sku.toLowerCase().includes(q) ||
          c.productName.toLowerCase().includes(q) ||
          c.storeName.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (selectedStore !== 'all' && c.storeId !== selectedStore) return false;
      if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;

      if (healthFilter === 'phantom') {
        return c.riskScore >= 55;
      } else if (healthFilter === 'stale') {
        return c.isStaleInventory;
      } else if (healthFilter === 'zero_stock') {
        return c.recordedStock === 0;
      } else if (healthFilter === 'healthy') {
        return c.riskScore < 35 && c.recordedStock > 0;
      }

      return true;
    });
  }, [cases, searchQuery, selectedStore, selectedCategory, healthFilter]);

  // Aggregate metrics
  const totalUnitsOnHand = cases.reduce((sum, c) => sum + c.recordedStock, 0);
  const totalInventoryValue = cases.reduce((sum, c) => sum + c.recordedStock * c.unitPrice, 0);
  const staleCount = cases.filter(c => c.isStaleInventory).length;

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-teal-400" />
            <h1 className="text-xl font-bold text-slate-100">
              Inventory Snapshot & Stock Health Explorer
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-reference recorded inventory against real sales velocity to detect ghost inventory and stale records.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Monitored Units
          </div>
          <div className="text-2xl font-extrabold font-mono text-purple-400 mt-1">
            {totalUnitsOnHand.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across all store shelves</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            On-Hand Valuation
          </div>
          <div className="text-2xl font-extrabold font-mono text-teal-400 mt-1">
            {formatINR(totalInventoryValue)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Estimated cost-equivalent</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Stale Snapshot Warnings
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-400 mt-1">
            {staleCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">&gt;4 days without update</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Ghost Inventory Risk
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-400 mt-1">
            {cases.filter(c => c.riskScore >= 55).length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Positive stock, zero velocity</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, SKU or store..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-200 focus:outline-none"
            >
              <option value="all">All Stores ({stores.length})</option>
              {stores.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-200 focus:outline-none"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Health status filter tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px]">Filter Health:</span>
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-[11px] flex-wrap">
            <button
              onClick={() => setHealthFilter('all')}
              className={`px-2.5 py-1 rounded-md transition ${healthFilter === 'all' ? 'bg-slate-800 text-slate-100 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All Items ({cases.length})
            </button>
            <button
              onClick={() => setHealthFilter('phantom')}
              className={`px-2.5 py-1 rounded-md transition ${healthFilter === 'phantom' ? 'bg-rose-500/20 text-rose-300 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Suspected Phantom Stock-Outs
            </button>
            <button
              onClick={() => setHealthFilter('stale')}
              className={`px-2.5 py-1 rounded-md transition ${healthFilter === 'stale' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Stale Snapshots
            </button>
            <button
              onClick={() => setHealthFilter('healthy')}
              className={`px-2.5 py-1 rounded-md transition ${healthFilter === 'healthy' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Normal Moving Stock
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Grid Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/70 text-xs text-slate-400 flex items-center justify-between">
          <span>Showing <strong className="text-slate-200 font-mono">{filteredItems.length}</strong> items</span>
          <span>Click any row to drill into sales and inventory timeline</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 px-3">Store Location</th>
                <th className="py-3 px-3 text-right">Recorded Stock</th>
                <th className="py-3 px-3 text-right">Unit Price (₹)</th>
                <th className="py-3 px-3 text-right">Inventory Value (₹)</th>
                <th className="py-3 px-3 text-right">Recent Velocity</th>
                <th className="py-3 px-3 text-right">Days of Supply</th>
                <th className="py-3 px-3 text-center">Health Indicator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300 font-medium">
              {filteredItems.map(c => {
                const daysOfSupply = c.recentSalesAvg > 0
                  ? (c.recordedStock / c.recentSalesAvg).toFixed(1)
                  : c.recordedStock > 0 ? '∞ (Zero sales)' : '0';

                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    className="hover:bg-slate-800/50 transition cursor-pointer group"
                  >
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {c.sku}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-100 group-hover:text-teal-300 transition">
                        {c.productName}
                      </div>
                      <div className="text-[10px] text-slate-500">{c.category}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-200">{c.storeName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{c.region}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-purple-300">
                      {c.recordedStock} u
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      {formatINR(c.unitPrice, true)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-teal-300 font-semibold">
                      {formatINR(c.recordedStock * c.unitPrice, true)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      <span className={c.recentSalesAvg === 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {c.recentSalesAvg} u/d
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[11px]">
                      {daysOfSupply}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {c.riskScore >= 75 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          Severe Phantom Risk
                        </span>
                      ) : c.riskScore >= 55 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Suspicious
                        </span>
                      ) : c.isStaleInventory ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                          Stale Record
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Healthy Flow
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
