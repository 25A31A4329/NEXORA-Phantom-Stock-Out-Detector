import React from 'react';
import {
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Database,
  Store,
  Layers,
  Info
} from 'lucide-react';
import { DatasetState } from '../../types';

interface NavbarProps {
  dataset: DatasetState;
  onResetDemo: () => void;
  hasGeminiKey: boolean;
  activeTab: string;
  totalAlertsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  dataset,
  onResetDemo,
  hasGeminiKey,
  totalAlertsCount,
}) => {
  const storeCount = dataset.stores.length || new Set(dataset.sales.map(s => s.store_id)).size;
  const skuCount = new Set(dataset.sales.map(s => s.sku)).size;

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-6 flex items-center justify-between">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20 ring-1 ring-teal-400/30">
          <ShieldAlert className="w-5 h-5 text-slate-950" strokeWidth={2.4} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-wider text-slate-100 font-mono">
              NEXORA
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
              v1.0 Hackathon Edition
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Phantom Stock-Out Intelligence & Verification Queue
          </p>
        </div>
      </div>

      {/* Center status badges */}
      <div className="hidden md:flex items-center gap-3">
        {dataset.isDemoData ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>DEMO DATA ACTIVE</span>
            <span className="text-[10px] text-amber-400/80 font-normal ml-1">
              (Synthetic Baseline)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-medium">
            <Database className="w-3.5 h-3.5" />
            <span>LIVE CUSTOM DATASET</span>
            <span className="text-[10px] text-teal-400/80 font-normal ml-1">
              ({dataset.sales.length} rows)
            </span>
          </div>
        )}

        {/* Network Metrics preview */}
        <div className="flex items-center gap-3 text-xs text-slate-400 bg-slate-900/60 px-3 py-1 rounded-md border border-slate-800">
          <div className="flex items-center gap-1">
            <Store className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-slate-200 font-semibold">{storeCount}</span> stores
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-slate-200 font-semibold">{skuCount}</span> SKUs
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Gemini Engine Indicator */}
        <div
          title={hasGeminiKey ? 'Gemini 3.8 Flash Active for Audit Reasoning' : 'Deterministic Engine Active (Gemini API optional)'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
            hasGeminiKey
              ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
              : 'bg-slate-900/80 border-slate-700/60 text-slate-400'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${hasGeminiKey ? 'text-purple-400' : 'text-slate-500'}`} />
          <span className="hidden sm:inline">
            {hasGeminiKey ? 'Gemini 3.8 Flash' : 'Deterministic Mode'}
          </span>
        </div>

        {/* Reset Demo button */}
        <button
          onClick={onResetDemo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition"
          title="Reset back to standard synthetic demo data"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Reset Demo Data</span>
        </button>
      </div>
    </header>
  );
};
