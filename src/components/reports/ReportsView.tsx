import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Sparkles,
  FileText,
  Printer,
  Copy,
  Check,
  Building,
  IndianRupee,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { VerificationCase, DatasetState } from '../../types';
import { formatINR } from '../../utils/currency';

interface ReportsViewProps {
  cases: VerificationCase[];
  dataset: DatasetState;
  hasGeminiKey: boolean;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  cases,
  dataset,
  hasGeminiKey,
}) => {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const totalSalesAtRisk = cases.reduce((sum, c) => sum + (c.riskScore >= 35 ? c.estimatedSalesAtRisk : 0), 0);
  const suspiciousCount = cases.filter(c => c.riskScore >= 35).length;
  const highPriorityCount = cases.filter(c => c.riskScore >= 55).length;
  const verifiedCount = cases.filter(c => c.status !== 'pending').length;

  // Export ranked queue CSV
  const handleExportQueueCsv = () => {
    const top20 = cases.slice(0, 20);
    const headers = [
      'Rank',
      'SKU',
      'Product Name',
      'Store ID',
      'Store Name',
      'Region',
      'Recorded Stock',
      'Recent Sales Avg (u/d)',
      'Baseline Sales Avg (u/d)',
      'Velocity Drop (%)',
      'Zero Sales Streak (days)',
      'Risk Score (0-100)',
      'Risk Level',
      'Confidence (%)',
      'Est Sales At Risk (INR)',
      'Recommended Action',
      'Verification Status',
      'Auditor Notes',
    ];

    const rows = top20.map((c, i) => [
      i + 1,
      `"${c.sku}"`,
      `"${c.productName}"`,
      `"${c.storeId}"`,
      `"${c.storeName}"`,
      `"${c.region}"`,
      c.recordedStock,
      c.recentSalesAvg,
      c.baselineSalesAvg,
      c.dropPercent,
      c.consecutiveZeroSalesDays,
      c.riskScore,
      c.riskLevel,
      c.confidenceLevel,
      c.estimatedSalesAtRisk,
      `"${c.recommendedAction.replace(/"/g, '""')}"`,
      c.status,
      `"${(c.userNotes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csvContent, 'nexora_ranked_verification_queue_top20.csv');
  };

  // Export full analysis CSV
  const handleExportFullAnalysisCsv = () => {
    const headers = [
      'Store ID',
      'Store Name',
      'Region',
      'SKU',
      'Product Name',
      'Category',
      'Unit Price (INR)',
      'Recorded Stock',
      'Recent Sales Avg',
      'Baseline Sales Avg',
      'Velocity Drop Pct',
      'Zero Sales Streak Days',
      'Regularity Ratio',
      'Is Promoted',
      'Risk Score',
      'Risk Level',
      'Confidence Pct',
      'Velocity Drop Score',
      'Zero Streak Score',
      'Stock Discrepancy Score',
      'Promo Discrepancy Score',
      'Est Lost Units',
      'Est Sales At Risk (INR)',
      'Verification Status',
      'Primary Reason',
    ];

    const rows = cases.map(c => [
      `"${c.storeId}"`,
      `"${c.storeName}"`,
      `"${c.region}"`,
      `"${c.sku}"`,
      `"${c.productName}"`,
      `"${c.category}"`,
      c.unitPrice,
      c.recordedStock,
      c.recentSalesAvg,
      c.baselineSalesAvg,
      c.dropPercent,
      c.consecutiveZeroSalesDays,
      c.regularityRatio,
      c.isPromoted ? 1 : 0,
      c.riskScore,
      c.riskLevel,
      c.confidenceLevel,
      c.breakdown.velocityDropScore,
      c.breakdown.zeroStreakScore,
      c.breakdown.stockDiscrepancyScore,
      c.breakdown.promoDiscrepancyScore,
      c.estimatedLostUnits,
      c.estimatedSalesAtRisk,
      c.status,
      `"${(c.reasons[0] || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csvContent, 'nexora_full_phantom_analysis_all_cases.csv');
  };

  const downloadBlob = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate Executive Summary
  const handleGenerateAiSummary = async () => {
    setIsLoadingAi(true);
    try {
      const topStoreNames = Array.from(new Set(cases.slice(0, 5).map(c => c.storeName))).join(', ');
      const res = await fetch('/api/gemini/executive-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summaryData: {
            totalSkus: new Set(dataset.sales.map(s => s.sku)).size,
            totalStores: dataset.stores.length || 5,
            suspiciousCount,
            highPriorityCount,
            salesAtRisk: Math.round(totalSalesAtRisk),
            verifiedCount,
            totalCases: cases.length,
            topStores: topStoreNames,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI executive summary');
      }
      setAiSummary(data.summary);
    } catch (e: any) {
      // Deterministic fallback
      setAiSummary(
        `NEXORA NETWORK AUDIT BRIEFING:\n\n` +
        `Across ${new Set(dataset.sales.map(s => s.sku)).size} SKUs and ${dataset.stores.length || 5} stores, NEXORA flagged ${highPriorityCount} critical phantom stock-out situations representing an estimated ${formatINR(totalSalesAtRisk)} in unrealized sales.\n\n` +
        `Key Action: Store General Managers must prioritize immediate shelf audits for top-ranked refrigerated dairy and high-value electronics. Ensure unworked backroom pallets are stocked before adjusting perpetual inventory counts.`
      );
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleCopyReport = () => {
    const text = `NEXORA PHANTOM STOCK-OUT REPORT
Generated: ${new Date().toLocaleString('en-IN')}
Mode: ${dataset.isDemoData ? 'DEMO DATASET' : 'LIVE DATASET'}
Total Monitored SKUs: ${new Set(dataset.sales.map(s => s.sku)).size}
Total Stores: ${dataset.stores.length || 5}
Suspicious Cases: ${suspiciousCount}
Critical Audits: ${highPriorityCount}
Est. Sales At Risk: ${formatINR(totalSalesAtRisk)}
Verified Audits: ${verifiedCount} / ${cases.length}

${aiSummary || 'Automated deterministic retail intelligence report generated by NEXORA.'}`;

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-400" />
            <h1 className="text-xl font-bold text-slate-100">
              Operational Reports & Data Exports
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Download ranked audit queues, full analytical datasets, and executive operational briefings.
          </p>
        </div>
      </div>

      {/* Download Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Top 20 Queue CSV */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">
                Store Associate Action List
              </span>
              <span className="text-xs font-mono text-slate-400">Top 20 Cases</span>
            </div>
            <h3 className="text-base font-bold text-slate-100 mt-1">
              Ranked Verification Queue (CSV)
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Formatted for store associates and inventory managers. Contains SKU details, store location, recorded inventory, risk score, recommended audit action, and auditor notes.
            </p>
          </div>

          <button
            onClick={handleExportQueueCsv}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition shadow-lg shadow-teal-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Download Top 20 Verification Queue (.CSV)</span>
          </button>
        </div>

        {/* Card 2: Full Dataset CSV */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider font-mono">
                Comprehensive Analyst Export
              </span>
              <span className="text-xs font-mono text-slate-400">{cases.length} Total Rows</span>
            </div>
            <h3 className="text-base font-bold text-slate-100 mt-1">
              Full Phantom Anomaly Analysis (CSV)
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Complete matrix with all sub-component scores (velocity drop, zero streak, stock discrepancy, promo lift, intermittency damper, confidence index) and dollar impact calculations.
            </p>
          </div>

          <button
            onClick={handleExportFullAnalysisCsv}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download Full Analytical Matrix (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Executive Summary Card with Optional Gemini Synthesis */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h2 className="text-base font-bold text-slate-100">
                Executive Leadership Briefing
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              High-level operational summary suitable for retail VPs, store operations directors, and loss prevention managers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAiSummary}
              disabled={isLoadingAi}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition shadow-md shadow-purple-600/20 disabled:opacity-50"
            >
              {isLoadingAi ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Synthesizing Briefing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiSummary ? 'Regenerate Briefing' : 'Generate Executive Briefing'}</span>
                </>
              )}
            </button>
            <button
              onClick={handleCopyReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              {copiedNotification ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedNotification ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>
        </div>

        {/* Executive Memo Body */}
        {aiSummary ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans">
            {aiSummary}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 leading-relaxed space-y-2">
            <p>
              Click <strong>Generate Executive Briefing</strong> to synthesize key findings, floor associate allocation directives, and root-cause loss prevention takeaways across all {cases.length} combinations.
            </p>
          </div>
        )}

        {/* Structured Executive Metrics Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Flagged Anomaly Rate</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {((suspiciousCount / (cases.length || 1)) * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400">{suspiciousCount} of {cases.length} pairs</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Revenue Exposure</div>
            <div className="text-xl font-bold font-mono text-teal-400 mt-1">
              {formatINR(totalSalesAtRisk)}
            </div>
            <div className="text-[10px] text-slate-400">Total unrealized demand</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Immediate Priority</div>
            <div className="text-xl font-bold font-mono text-rose-400 mt-1">
              {highPriorityCount}
            </div>
            <div className="text-[10px] text-slate-400">Severe & High cases</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Audit Resolution</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {verifiedCount}
            </div>
            <div className="text-[10px] text-slate-400">Floor checks completed</div>
          </div>
        </div>
      </div>
    </div>
  );
};
