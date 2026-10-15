import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTabId } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { VerificationQueueView } from './components/queue/VerificationQueueView';
import { InventoryExplorerView } from './components/inventory/InventoryExplorerView';
import { RiskAnalysisView } from './components/risk/RiskAnalysisView';
import { DataUploadView } from './components/upload/DataUploadView';
import { EvaluationView } from './components/evaluation/EvaluationView';
import { ReportsView } from './components/reports/ReportsView';
import { CaseDetailModal } from './components/queue/CaseDetailModal';
import {
  DatasetState,
  VerificationCase,
  VerificationStatus,
  DetectionWeights,
} from './types';
import {
  loadStoredDataset,
  saveDataset,
  loadStoredVerifications,
  saveVerification,
  loadStoredWeights,
  saveStoredWeights,
  resetAllStorage,
} from './services/storage';
import { runDetectionAlgorithm } from './services/detectionEngine';
import { generateDemoDataset } from './services/demoData';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');
  const [dataset, setDataset] = useState<DatasetState>(() => loadStoredDataset());
  const [weights, setWeights] = useState<DetectionWeights>(() => loadStoredWeights());
  const [storedVerifications, setStoredVerifications] = useState<Record<string, any>>(() => loadStoredVerifications());
  const [selectedCaseModal, setSelectedCaseModal] = useState<VerificationCase | null>(null);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(false);

  // Check backend health & Gemini API key presence
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.hasGeminiKey) {
          setHasGeminiKey(true);
        }
      })
      .catch(() => {
        // Dev server or client mode fallback
      });
  }, []);

  // Recalculate cases whenever dataset, weights, or verifications change
  const cases: VerificationCase[] = useMemo(() => {
    return runDetectionAlgorithm(dataset, weights, storedVerifications);
  }, [dataset, weights, storedVerifications]);

  // Handle status update from modal or quick button
  const handleUpdateStatus = (caseId: string, status: VerificationStatus, notes: string = '') => {
    const updated = saveVerification(caseId, {
      status,
      notes,
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'Store Associate #4812',
    });
    setStoredVerifications({ ...updated });

    // Also update current modal if open
    if (selectedCaseModal && selectedCaseModal.id === caseId) {
      setSelectedCaseModal(prev => prev ? {
        ...prev,
        status,
        userNotes: notes,
        verifiedAt: new Date().toISOString(),
      } : null);
    }
  };

  const handleQuickUpdateStatus = (caseId: string, status: VerificationStatus) => {
    const current = storedVerifications[caseId];
    const notes = current?.notes || '';
    handleUpdateStatus(caseId, status, notes);
  };

  // Reset to initial demo dataset
  const handleResetToDemo = () => {
    resetAllStorage();
    const demo = generateDemoDataset();
    setDataset(demo);
    setStoredVerifications({});
    setActiveTab('dashboard');
  };

  // Load benchmark ground truth
  const handleLoadDemoGroundTruth = () => {
    const demo = generateDemoDataset();
    const updatedDataset: DatasetState = {
      ...dataset,
      groundTruth: demo.groundTruth,
      lastUpdated: new Date().toISOString(),
    };
    setDataset(updatedDataset);
    saveDataset(updatedDataset);
  };

  // Handle dataset replacement from CSV upload
  const handleApplyNewDataset = (newDataset: DatasetState) => {
    setDataset(newDataset);
    saveDataset(newDataset);
    setActiveTab('queue'); // Jump straight to queue to see new findings
  };

  // Handle weights update
  const handleUpdateWeights = (newWeights: DetectionWeights) => {
    setWeights(newWeights);
    saveStoredWeights(newWeights);
  };

  // Export CSV helper
  const handleExportCsv = (filteredCases: VerificationCase[]) => {
    const headers = [
      'Rank',
      'SKU',
      'Product Name',
      'Category',
      'Store ID',
      'Store Name',
      'Region',
      'Recorded Stock',
      'Recent Sales Avg',
      'Baseline Sales Avg',
      'Velocity Drop Pct',
      'Zero Sales Streak',
      'Risk Score',
      'Risk Level',
      'Confidence Pct',
      'Sales At Risk (INR)',
      'Recommended Action',
      'Verification Status',
      'Auditor Notes',
    ];

    const rows = filteredCases.map((c, i) => [
      i + 1,
      `"${c.sku}"`,
      `"${c.productName}"`,
      `"${c.category}"`,
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
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nexora_verification_queue_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate pending counts
  const pendingCount = cases.filter(c => c.status === 'pending').length;
  const severeCount = cases.filter(c => c.riskLevel === 'severe' && c.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#060b14] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        dataset={dataset}
        onResetDemo={handleResetToDemo}
        hasGeminiKey={hasGeminiKey}
        activeTab={activeTab}
        totalAlertsCount={cases.filter(c => c.riskScore >= 55).length}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingQueueCount={pendingCount}
          severeCount={severeCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#060b14]">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                cases={cases}
                dataset={dataset}
                onSelectCase={(c) => setSelectedCaseModal(c)}
                onNavigateToQueue={() => setActiveTab('queue')}
                onNavigateToUpload={() => setActiveTab('upload')}
              />
            )}

            {activeTab === 'queue' && (
              <VerificationQueueView
                cases={cases}
                onSelectCase={(c) => setSelectedCaseModal(c)}
                onQuickUpdateStatus={handleQuickUpdateStatus}
                onExportCsv={handleExportCsv}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryExplorerView
                cases={cases}
                dataset={dataset}
                onSelectCase={(c) => setSelectedCaseModal(c)}
              />
            )}

            {activeTab === 'risk' && (
              <RiskAnalysisView
                weights={weights}
                onUpdateWeights={handleUpdateWeights}
                totalCasesCount={cases.length}
                severeCount={cases.filter(c => c.riskLevel === 'severe').length}
              />
            )}

            {activeTab === 'upload' && (
              <DataUploadView
                currentDataset={dataset}
                onApplyNewDataset={handleApplyNewDataset}
                onResetToDemo={handleResetToDemo}
              />
            )}

            {activeTab === 'evaluation' && (
              <EvaluationView
                cases={cases}
                groundTruth={dataset.groundTruth}
                onLoadDemoGroundTruth={handleLoadDemoGroundTruth}
                onNavigateToUpload={() => setActiveTab('upload')}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                cases={cases}
                dataset={dataset}
                hasGeminiKey={hasGeminiKey}
              />
            )}
          </div>
        </main>
      </div>

      {/* Case Drilldown & Audit Modal */}
      {selectedCaseModal && (
        <CaseDetailModal
          caseItem={selectedCaseModal}
          onClose={() => setSelectedCaseModal(null)}
          onUpdateStatus={handleUpdateStatus}
          hasGeminiKey={hasGeminiKey}
        />
      )}
    </div>
  );
}
