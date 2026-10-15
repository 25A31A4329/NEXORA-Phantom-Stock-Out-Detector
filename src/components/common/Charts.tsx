import React, { useState } from 'react';
import { TimelineDataPoint } from '../../types';
import { formatINR } from '../../utils/currency';

interface DailySalesChartProps {
  timeline: TimelineDataPoint[];
  height?: number;
  showStock?: boolean;
}

export const DailySalesChart: React.FC<DailySalesChartProps> = ({
  timeline,
  height = 180,
  showStock = true,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-500 bg-slate-900/50 rounded-lg border border-slate-800">
        No timeline data points available
      </div>
    );
  }

  // Determine bounds
  const maxSales = Math.max(5, ...timeline.map(d => d.units_sold));
  const maxStock = showStock
    ? Math.max(1, ...timeline.map(d => d.recorded_stock || 0))
    : 1;

  const yMax = Math.max(maxSales * 1.25, 6);
  const baseline = timeline[0]?.baseline_estimate || 0;

  const paddingLeft = 36;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 28;
  const width = 600; // viewBox width

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getX = (idx: number) => paddingLeft + (idx / Math.max(1, timeline.length - 1)) * chartW;
  const getY = (val: number) => paddingTop + chartH - (val / yMax) * chartH;

  // Baseline Y line
  const baselineY = getY(baseline);

  // Sparkline points for recorded stock
  const stockPoints = timeline
    .map((d, i) => {
      if (d.recorded_stock === null || d.recorded_stock === undefined) return null;
      // Scale stock to fit within chart height nicely (stock can be higher than daily sales)
      const scaledVal = Math.min(yMax, (d.recorded_stock / (maxStock || 1)) * (yMax * 0.85));
      return `${getX(i)},${getY(scaledVal)}`;
    })
    .filter(Boolean)
    .join(' ');

  const hoveredItem = hoveredIdx !== null ? timeline[hoveredIdx] : null;

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="salesBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="promoBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.33, 0.66, 1].map((pct, i) => {
          const y = paddingTop + chartH * (1 - pct);
          const labelVal = Math.round(yMax * pct);
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#1e293b"
                strokeDasharray="3,3"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 6}
                y={y + 3}
                fill="#64748b"
                fontSize="10"
                textAnchor="end"
                className="font-mono"
              >
                {labelVal}
              </text>
            </g>
          );
        })}

        {/* Historical baseline reference line */}
        {baseline > 0 && (
          <g>
            <line
              x1={paddingLeft}
              y1={baselineY}
              x2={width - paddingRight}
              y2={baselineY}
              stroke="#38bdf8"
              strokeDasharray="4,4"
              strokeWidth="1.5"
              opacity="0.85"
            />
            <text
              x={width - paddingRight - 4}
              y={baselineY - 4}
              fill="#38bdf8"
              fontSize="9.5"
              textAnchor="end"
              fontWeight="600"
            >
              Baseline: {baseline.toFixed(1)} u/d
            </text>
          </g>
        )}

        {/* Bars for daily sales units */}
        {timeline.map((d, i) => {
          const barW = Math.max(3, (chartW / timeline.length) * 0.65);
          const x = getX(i) - barW / 2;
          const barH = (d.units_sold / yMax) * chartH;
          const y = paddingTop + chartH - barH;
          const isPromo = d.is_promoted;
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={d.date}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Invisible touch expander */}
              <rect
                x={getX(i) - (chartW / timeline.length) / 2}
                y={paddingTop}
                width={chartW / timeline.length}
                height={chartH + paddingBottom}
                fill="transparent"
              />

              {/* Bar */}
              <rect
                x={x}
                y={d.units_sold === 0 ? paddingTop + chartH - 2 : y}
                width={barW}
                height={d.units_sold === 0 ? 2 : Math.max(3, barH)}
                rx="2"
                fill={d.units_sold === 0 ? '#475569' : isPromo ? 'url(#promoBarGrad)' : 'url(#salesBarGrad)'}
                stroke={isHovered ? '#f8fafc' : isPromo ? '#fbbf24' : '#2dd4bf'}
                strokeWidth={isHovered ? 1.5 : 0}
                opacity={hoveredIdx !== null && !isHovered ? 0.6 : 1}
              />

              {/* Promo marker pin on top */}
              {isPromo && (
                <circle
                  cx={getX(i)}
                  cy={Math.max(paddingTop + 6, y - 5)}
                  r="3"
                  fill="#f59e0b"
                  stroke="#111827"
                  strokeWidth="1"
                />
              )}
            </g>
          );
        })}

        {/* Recorded Stock Trend Line (Overlay) */}
        {showStock && stockPoints && (
          <g>
            <polyline
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeDasharray="3,2"
              opacity="0.8"
              points={stockPoints}
            />
          </g>
        )}

        {/* X-axis labels (sampled) */}
        {timeline.map((d, i) => {
          // Show ~5 date labels across width
          const step = Math.max(1, Math.floor(timeline.length / 5));
          if (i % step !== 0 && i !== timeline.length - 1) return null;
          const formatted = d.date.slice(5); // MM-DD
          return (
            <text
              key={d.date}
              x={getX(i)}
              y={height - 8}
              fill="#64748b"
              fontSize="9"
              textAnchor="middle"
              className="font-mono"
            >
              {formatted}
            </text>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredItem && (
        <div className="absolute top-2 right-4 bg-slate-900/95 backdrop-blur border border-slate-700/80 px-2.5 py-1.5 rounded shadow-xl text-xs flex items-center gap-3 z-10 pointer-events-none">
          <div className="text-slate-300 font-mono text-[11px] font-semibold">{hoveredItem.date}</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            <span className="text-slate-400">Sold:</span>
            <span className="font-bold text-teal-300 font-mono">{hoveredItem.units_sold} u</span>
          </div>
          {hoveredItem.recorded_stock !== null && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span className="text-slate-400">Recorded Stock:</span>
              <span className="font-bold text-purple-300 font-mono">{hoveredItem.recorded_stock} u</span>
            </div>
          )}
          {hoveredItem.is_promoted && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/40">
              PROMO
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-xs bg-teal-500"></span>
            <span>Daily Sales Units</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-sky-400"></span>
            <span>Historical Baseline</span>
          </div>
          {showStock && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dotted border-purple-400"></span>
              <span>System Stock Trend</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Active Promotion</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          Hover bars for day metrics
        </div>
      </div>
    </div>
  );
};

interface RiskDistributionChartProps {
  distribution: {
    severe: number;
    high: number;
    medium: number;
    low: number;
  };
}

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ distribution }) => {
  const total = distribution.severe + distribution.high + distribution.medium + distribution.low || 1;

  const items = [
    { label: 'Severe Risk (≥75)', count: distribution.severe, color: '#f43f5e', bg: 'bg-rose-500' },
    { label: 'High Priority (55-74)', count: distribution.high, color: '#f59e0b', bg: 'bg-amber-500' },
    { label: 'Medium Risk (35-54)', count: distribution.medium, color: '#eab308', bg: 'bg-yellow-500' },
    { label: 'Normal / Low (<35)', count: distribution.low, color: '#10b981', bg: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
        {items.map((it, idx) => {
          const pct = (it.count / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={idx}
              style={{ width: `${pct}%`, backgroundColor: it.color }}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
              title={`${it.label}: ${it.count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Grid of badges */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {items.map((it, idx) => {
          const pct = Math.round((it.count / total) * 100);
          return (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80"
            >
              <div className="flex items-center gap-2 truncate">
                <span className={`w-2 h-2 rounded-full ${it.bg} shrink-0`} />
                <span className="text-slate-300 truncate text-[11px]">{it.label}</span>
              </div>
              <div className="flex items-baseline gap-1 font-mono shrink-0">
                <span className="font-bold text-slate-100">{it.count}</span>
                <span className="text-[10px] text-slate-500">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface StoreComparisonChartProps {
  stores: Array<{
    storeId: string;
    storeName: string;
    suspiciousCount: number;
    salesAtRisk: number;
  }>;
}

export const StoreComparisonChart: React.FC<StoreComparisonChartProps> = ({ stores }) => {
  if (!stores || stores.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center text-xs text-slate-500">
        No store comparison data available
      </div>
    );
  }

  const maxCases = Math.max(1, ...stores.map(s => s.suspiciousCount));

  return (
    <div className="space-y-2.5">
      {stores.map(store => {
        const pct = Math.round((store.suspiciousCount / maxCases) * 100);
        return (
          <div key={store.storeId} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium truncate max-w-[210px]">
                {store.storeName}
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-amber-400 font-bold">{store.suspiciousCount} cases</span>
                <span className="text-slate-500">|</span>
                <span className="text-teal-400 font-semibold">{formatINR(store.salesAtRisk)} risk</span>
              </div>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(4, pct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
