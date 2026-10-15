import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  RotateCcw,
  Check,
  Table,
  ArrowRight,
  Info,
  ShieldCheck,
} from 'lucide-react';
import {
  DatasetState,
  SalesRecord,
  InventoryRecord,
  PromotionRecord,
  StoreRecord,
  GroundTruthRecord,
} from '../../types';
import {
  parseCsvFile,
  convertToSalesRecords,
  convertToInventoryRecords,
  convertToPromotionRecords,
  convertToStoreRecords,
  convertToGroundTruthRecords,
  ParsedCsvResult,
} from '../../services/csvParser';
import { generateSampleCsvContent } from '../../services/demoData';

interface DataUploadViewProps {
  currentDataset: DatasetState;
  onApplyNewDataset: (dataset: DatasetState) => void;
  onResetToDemo: () => void;
}

export const DataUploadView: React.FC<DataUploadViewProps> = ({
  currentDataset,
  onApplyNewDataset,
  onResetToDemo,
}) => {
  // Pending parsed state
  const [pendingSales, setPendingSales] = useState<{ rows: any[]; mapping: Record<string, string>; fileName: string; headers: string[] } | null>(null);
  const [pendingInventory, setPendingInventory] = useState<{ rows: any[]; mapping: Record<string, string>; fileName: string; headers: string[] } | null>(null);
  const [pendingPromotions, setPendingPromotions] = useState<{ rows: any[]; mapping: Record<string, string>; fileName: string; headers: string[] } | null>(null);
  const [pendingStores, setPendingStores] = useState<{ rows: any[]; mapping: Record<string, string>; fileName: string; headers: string[] } | null>(null);
  const [pendingGroundTruth, setPendingGroundTruth] = useState<{ rows: any[]; mapping: Record<string, string>; fileName: string; headers: string[] } | null>(null);

  const [activeInspector, setActiveInspector] = useState<'sales' | 'inventory' | 'promotions' | 'stores' | 'groundTruth' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // File drop/selection handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetType?: 'sales' | 'inventory' | 'promotions' | 'stores' | 'groundTruth') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed: ParsedCsvResult = await parseCsvFile(file);
      const chosenType = targetType || parsed.detectedType;

      if (chosenType === 'sales') {
        setPendingSales({
          rows: parsed.rows,
          mapping: parsed.suggestedMapping,
          fileName: parsed.fileName,
          headers: parsed.headers,
        });
        setActiveInspector('sales');
      } else if (chosenType === 'inventory') {
        setPendingInventory({
          rows: parsed.rows,
          mapping: parsed.suggestedMapping,
          fileName: parsed.fileName,
          headers: parsed.headers,
        });
        setActiveInspector('inventory');
      } else if (chosenType === 'promotions') {
        setPendingPromotions({
          rows: parsed.rows,
          mapping: parsed.suggestedMapping,
          fileName: parsed.fileName,
          headers: parsed.headers,
        });
        setActiveInspector('promotions');
      } else if (chosenType === 'stores') {
        setPendingStores({
          rows: parsed.rows,
          mapping: parsed.suggestedMapping,
          fileName: parsed.fileName,
          headers: parsed.headers,
        });
        setActiveInspector('stores');
      } else if (chosenType === 'groundTruth') {
        setPendingGroundTruth({
          rows: parsed.rows,
          mapping: parsed.suggestedMapping,
          fileName: parsed.fileName,
          headers: parsed.headers,
        });
        setActiveInspector('groundTruth');
      } else {
        // Default to sales if unknown
        setPendingSales({
          rows: parsed.rows,
          mapping: parsed.suggestedMapping,
          fileName: parsed.fileName,
          headers: parsed.headers,
        });
        setActiveInspector('sales');
      }

      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(`CSV parsing error: ${err.message || 'Invalid format'}`);
    }
  };

  const handleDownloadSample = (type: 'sales' | 'inventory' | 'promotions' | 'stores' | 'groundTruth') => {
    const csv = generateSampleCsvContent(type);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nexora_sample_${type}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCommitAnalysis = () => {
    setErrorMessage(null);

    // If no sales uploaded, warn user
    if (!pendingSales && currentDataset.sales.length === 0) {
      setErrorMessage('Daily sales dataset is required to detect sales velocity drops.');
      return;
    }

    let finalSales: SalesRecord[] = currentDataset.sales;
    let finalInventory: InventoryRecord[] = currentDataset.inventory;
    let finalPromotions: PromotionRecord[] = currentDataset.promotions;
    let finalStores: StoreRecord[] = currentDataset.stores;
    let finalGroundTruth: GroundTruthRecord[] = currentDataset.groundTruth;

    if (pendingSales) {
      const { records, errors } = convertToSalesRecords(pendingSales.rows, pendingSales.mapping);
      if (errors.length > 0 && records.length === 0) {
        setErrorMessage(errors.join('. '));
        return;
      }
      finalSales = records;
    }

    if (pendingInventory) {
      const { records } = convertToInventoryRecords(pendingInventory.rows, pendingInventory.mapping);
      if (records.length > 0) finalInventory = records;
    }

    if (pendingPromotions) {
      const { records } = convertToPromotionRecords(pendingPromotions.rows, pendingPromotions.mapping);
      if (records.length > 0) finalPromotions = records;
    }

    if (pendingStores) {
      const { records } = convertToStoreRecords(pendingStores.rows, pendingStores.mapping);
      if (records.length > 0) finalStores = records;
    }

    if (pendingGroundTruth) {
      const { records } = convertToGroundTruthRecords(pendingGroundTruth.rows, pendingGroundTruth.mapping);
      if (records.length > 0) finalGroundTruth = records;
    }

    const newDataset: DatasetState = {
      sales: finalSales,
      inventory: finalInventory,
      promotions: finalPromotions,
      stores: finalStores,
      groundTruth: finalGroundTruth,
      isDemoData: false, // Marked as custom real data
      lastUpdated: new Date().toISOString(),
    };

    onApplyNewDataset(newDataset);
    setSuccessMessage('Custom retail dataset successfully loaded and analyzed!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Helper to update column mapping in inspector
  const updateMapping = (
    type: 'sales' | 'inventory' | 'promotions' | 'stores' | 'groundTruth',
    field: string,
    column: string
  ) => {
    if (type === 'sales' && pendingSales) {
      setPendingSales({
        ...pendingSales,
        mapping: { ...pendingSales.mapping, [field]: column },
      });
    } else if (type === 'inventory' && pendingInventory) {
      setPendingInventory({
        ...pendingInventory,
        mapping: { ...pendingInventory.mapping, [field]: column },
      });
    } else if (type === 'promotions' && pendingPromotions) {
      setPendingPromotions({
        ...pendingPromotions,
        mapping: { ...pendingPromotions.mapping, [field]: column },
      });
    } else if (type === 'stores' && pendingStores) {
      setPendingStores({
        ...pendingStores,
        mapping: { ...pendingStores.mapping, [field]: column },
      });
    } else if (type === 'groundTruth' && pendingGroundTruth) {
      setPendingGroundTruth({
        ...pendingGroundTruth,
        mapping: { ...pendingGroundTruth.mapping, [field]: column },
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-teal-400" />
            <h1 className="text-xl font-bold text-slate-100">
              CSV Data Ingestion & Schema Mapper
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Ingest retail CSV exports. Inspect schema mappings and preview sample records prior to running the detection algorithm.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onResetToDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Load Demo Dataset</span>
          </button>
          <button
            onClick={handleCommitAnalysis}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition shadow-lg shadow-teal-500/20"
          >
            <Check className="w-4 h-4" />
            <span>Commit Files & Run Detection</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-teal-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Analysis Capability Matrix */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-400" />
          <span>Ingestion Capability Matrix (Graceful Degradation)</span>
        </h3>
        <p className="text-xs text-slate-400">
          NEXORA will never crash if optional files are missing. The table below details what each data source unlocks:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="font-semibold text-slate-200 flex items-center justify-between">
              <span>A. Daily Sales</span>
              <span className="text-[10px] text-teal-400 font-mono">Mandatory</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Unlocks historical velocity, zero streaks, baseline demand, and sales collapse alerts.
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="font-semibold text-slate-200 flex items-center justify-between">
              <span>B. Inventory Snapshots</span>
              <span className="text-[10px] text-purple-400 font-mono">Key Indicator</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Unlocks positive stock discrepancy detection (distinguishing phantom stock from true OOS).
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="font-semibold text-slate-200 flex items-center justify-between">
              <span>C. Promotion Calendar</span>
              <span className="text-[10px] text-amber-400 font-mono">Optional</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Unlocks promotional lift failure detection (missing sales surge during ad window).
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="font-semibold text-slate-200 flex items-center justify-between">
              <span>D. Store Master</span>
              <span className="text-[10px] text-cyan-400 font-mono">Optional</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Enriches store numbers with friendly store names and regional market groupings.
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="font-semibold text-slate-200 flex items-center justify-between">
              <span>E. Ground Truth</span>
              <span className="text-[10px] text-emerald-400 font-mono">Benchmark</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Unlocks Precision@20, Recall, and False Positive Rate metrics on verified physical audits.
            </div>
          </div>
        </div>
      </div>

      {/* 5 Dropzones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Dropzone 1: Sales */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-400" />
                A. Daily Sales Data
              </span>
              <span className="text-[10px] font-mono font-bold text-teal-400 px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                REQUIRED
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Expected: date, store_id, sku, units_sold, unit_price
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-dashed border-slate-700 text-center space-y-2">
            {pendingSales ? (
              <div className="text-xs text-teal-300 font-mono flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>{pendingSales.fileName} ({pendingSales.rows.length} rows)</span>
              </div>
            ) : currentDataset.sales.length > 0 ? (
              <div className="text-xs text-slate-300 font-mono">
                Loaded: {currentDataset.sales.length} rows
              </div>
            ) : (
              <div className="text-xs text-slate-500">No sales file uploaded</div>
            )}

            <label className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition border border-slate-700">
              <span>Choose Sales CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'sales')}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <button
              onClick={() => handleDownloadSample('sales')}
              className="text-slate-400 hover:text-teal-400 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Sample CSV</span>
            </button>
            {pendingSales && (
              <button
                onClick={() => setActiveInspector('sales')}
                className="text-teal-400 hover:underline font-semibold"
              >
                Inspect Schema
              </button>
            )}
          </div>
        </div>

        {/* Dropzone 2: Inventory */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-400" />
                B. Inventory Snapshots
              </span>
              <span className="text-[10px] font-mono font-bold text-purple-400 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                RECOMMENDED
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Expected: date, store_id, sku, recorded_stock
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-dashed border-slate-700 text-center space-y-2">
            {pendingInventory ? (
              <div className="text-xs text-purple-300 font-mono flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>{pendingInventory.fileName} ({pendingInventory.rows.length} rows)</span>
              </div>
            ) : currentDataset.inventory.length > 0 ? (
              <div className="text-xs text-slate-300 font-mono">
                Loaded: {currentDataset.inventory.length} records
              </div>
            ) : (
              <div className="text-xs text-slate-500">No inventory file uploaded</div>
            )}

            <label className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition border border-slate-700">
              <span>Choose Inventory CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'inventory')}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <button
              onClick={() => handleDownloadSample('inventory')}
              className="text-slate-400 hover:text-purple-400 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Sample CSV</span>
            </button>
            {pendingInventory && (
              <button
                onClick={() => setActiveInspector('inventory')}
                className="text-purple-400 hover:underline font-semibold"
              >
                Inspect Schema
              </button>
            )}
          </div>
        </div>

        {/* Dropzone 3: Promotions */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                C. Promotion Calendar
              </span>
              <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                OPTIONAL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Expected: date, store_id, sku, promotion_flag
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-dashed border-slate-700 text-center space-y-2">
            {pendingPromotions ? (
              <div className="text-xs text-amber-300 font-mono flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>{pendingPromotions.fileName} ({pendingPromotions.rows.length} rows)</span>
              </div>
            ) : currentDataset.promotions.length > 0 ? (
              <div className="text-xs text-slate-300 font-mono">
                Loaded: {currentDataset.promotions.length} records
              </div>
            ) : (
              <div className="text-xs text-slate-500">No promotion file uploaded</div>
            )}

            <label className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition border border-slate-700">
              <span>Choose Promo CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'promotions')}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <button
              onClick={() => handleDownloadSample('promotions')}
              className="text-slate-400 hover:text-amber-400 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Sample CSV</span>
            </button>
            {pendingPromotions && (
              <button
                onClick={() => setActiveInspector('promotions')}
                className="text-amber-400 hover:underline font-semibold"
              >
                Inspect Schema
              </button>
            )}
          </div>
        </div>

        {/* Dropzone 4: Stores */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-400" />
                D. Store Master Data
              </span>
              <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                OPTIONAL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Expected: store_id, store_name, region
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-dashed border-slate-700 text-center space-y-2">
            {pendingStores ? (
              <div className="text-xs text-cyan-300 font-mono flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>{pendingStores.fileName} ({pendingStores.rows.length} rows)</span>
              </div>
            ) : currentDataset.stores.length > 0 ? (
              <div className="text-xs text-slate-300 font-mono">
                Loaded: {currentDataset.stores.length} stores
              </div>
            ) : (
              <div className="text-xs text-slate-500">No store master uploaded</div>
            )}

            <label className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition border border-slate-700">
              <span>Choose Store CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'stores')}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <button
              onClick={() => handleDownloadSample('stores')}
              className="text-slate-400 hover:text-cyan-400 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Sample CSV</span>
            </button>
            {pendingStores && (
              <button
                onClick={() => setActiveInspector('stores')}
                className="text-cyan-400 hover:underline font-semibold"
              >
                Inspect Schema
              </button>
            )}
          </div>
        </div>

        {/* Dropzone 5: Ground Truth (Optional Benchmark) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                E. Ground-Truth Labels
              </span>
              <span className="text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                ACCURACY BENCHMARK
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Expected: store_id, sku, is_phantom_stockout, notes
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-dashed border-slate-700 text-center space-y-2">
            {pendingGroundTruth ? (
              <div className="text-xs text-emerald-300 font-mono flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>{pendingGroundTruth.fileName} ({pendingGroundTruth.rows.length} rows)</span>
              </div>
            ) : currentDataset.groundTruth.length > 0 ? (
              <div className="text-xs text-slate-300 font-mono">
                Loaded: {currentDataset.groundTruth.length} labels
              </div>
            ) : (
              <div className="text-xs text-slate-500">No ground truth uploaded</div>
            )}

            <label className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition border border-slate-700">
              <span>Choose Ground Truth CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'groundTruth')}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <button
              onClick={() => handleDownloadSample('groundTruth')}
              className="text-slate-400 hover:text-emerald-400 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Sample CSV</span>
            </button>
            {pendingGroundTruth && (
              <button
                onClick={() => setActiveInspector('groundTruth')}
                className="text-emerald-400 hover:underline font-semibold"
              >
                Inspect Schema
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Schema Inspector & Sample Rows Drawer */}
      {activeInspector && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-teal-500/40 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Schema Mapping Inspector: {activeInspector.toUpperCase()}
              </h3>
            </div>
            <button
              onClick={() => setActiveInspector(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Close Inspector
            </button>
          </div>

          {/* Mapping Controls */}
          {activeInspector === 'sales' && pendingSales && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 font-semibold">
                Map Required Sales Fields to Your File's Columns:
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {['date', 'store_id', 'sku', 'units_sold', 'unit_price'].map((field) => (
                  <div key={field} className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400 block">{field}:</label>
                    <select
                      value={pendingSales.mapping[field] || ''}
                      onChange={(e) => updateMapping('sales', field, e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
                    >
                      <option value="">(Select column)</option>
                      {pendingSales.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Sample Rows Preview */}
              <div className="pt-2">
                <div className="text-xs font-semibold text-slate-400 mb-1">
                  Sample Data Rows (First 5 records):
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                      <tr>
                        {pendingSales.headers.map(h => (
                          <th key={h} className="py-2 px-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {pendingSales.rows.slice(0, 5).map((r, i) => (
                        <tr key={i}>
                          {pendingSales.headers.map(h => (
                            <td key={h} className="py-1.5 px-3">{String(r[h] ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeInspector === 'inventory' && pendingInventory && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 font-semibold">
                Map Inventory Columns:
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['date', 'store_id', 'sku', 'recorded_stock'].map((field) => (
                  <div key={field} className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400 block">{field}:</label>
                    <select
                      value={pendingInventory.mapping[field] || ''}
                      onChange={(e) => updateMapping('inventory', field, e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
                    >
                      <option value="">(Select column)</option>
                      {pendingInventory.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Sample preview */}
              <div className="pt-2">
                <div className="text-xs font-semibold text-slate-400 mb-1">Sample Records:</div>
                <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                      <tr>
                        {pendingInventory.headers.map(h => <th key={h} className="py-2 px-3">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {pendingInventory.rows.slice(0, 5).map((r, i) => (
                        <tr key={i}>
                          {pendingInventory.headers.map(h => <td key={h} className="py-1.5 px-3">{String(r[h] ?? '')}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeInspector === 'groundTruth' && pendingGroundTruth && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 font-semibold">
                Map Ground Truth Columns:
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['store_id', 'sku', 'is_phantom_stockout'].map((field) => (
                  <div key={field} className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400 block">{field}:</label>
                    <select
                      value={pendingGroundTruth.mapping[field] || ''}
                      onChange={(e) => updateMapping('groundTruth', field, e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
                    >
                      <option value="">(Select column)</option>
                      {pendingGroundTruth.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
