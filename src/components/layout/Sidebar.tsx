import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  SlidersHorizontal,
  ClipboardList,
  UploadCloud,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  Info,
} from 'lucide-react';

export type NavTabId = 'dashboard' | 'inventory' | 'risk' | 'queue' | 'upload' | 'evaluation' | 'reports';

interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  pendingQueueCount: number;
  severeCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingQueueCount,
  severeCount,
}) => {
  const navItems: Array<{
    id: NavTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'queue',
      label: 'Verification Queue',
      icon: ClipboardList,
      badge: severeCount > 0 ? severeCount : pendingQueueCount,
      badgeColor: severeCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    },
    {
      id: 'inventory',
      label: 'Inventory Explorer',
      icon: Boxes,
    },
    {
      id: 'risk',
      label: 'Risk & Weights',
      icon: SlidersHorizontal,
    },
    {
      id: 'upload',
      label: 'Data Upload',
      icon: UploadCloud,
    },
    {
      id: 'evaluation',
      label: 'Accuracy Benchmark',
      icon: CheckCircle2,
    },
    {
      id: 'reports',
      label: 'Reports & Export',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <aside className="w-64 shrink-0 bg-slate-950/80 border-r border-slate-800/80 flex flex-col justify-between p-3 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      {/* Navigation List */}
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-300">
          Intelligence Console
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm shadow-teal-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                    item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Uncertainty & Operational Callout */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2 mt-4">
        <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Operational Directive</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Suspicion is <strong>not</strong> confirmation. Scores signify anomaly probability. Always dispatch floor associates for physical shelf audits before adjusting inventory balance records.
        </p>
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-300">
          <span>Engine: Deterministic v1</span>
          <span className="text-teal-400">Zero AI Slop</span>
        </div>
      </div>
    </aside>
  );
};
