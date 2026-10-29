import React from 'react';
import { useCivic } from '../context/CivicContext';

export const KPISummaryStrip: React.FC = () => {
  const { stats, setActiveTab } = useCivic();

  const metrics = [
    {
      label: 'Raw Complaints (N)',
      value: stats.totalComplaints,
      subtext: 'Individual citizen & patrol filings',
    },
    {
      label: 'Unique Issues (U)',
      value: stats.uniqueIssues,
      subtext: 'Distinct municipal ground sites',
    },
    {
      label: 'Duplicates Consolidated (D)',
      value: stats.consolidatedDuplicates,
      subtext: 'Inflated tickets eliminated',
    },
    {
      label: 'Consolidation Rate',
      value: `${stats.consolidationRate}%`,
      subtext: 'Formula: (N - U) / N',
      highlight: true,
    },
    {
      label: 'Active Workload',
      value: stats.inProgressIssuesCount + (stats.uniqueIssues - stats.resolvedIssuesCount),
      subtext: `${stats.resolvedIssuesCount} resolved · ${stats.reopenedIssuesCount} reopened`,
    },
    {
      label: 'Review Queue',
      value: stats.pendingReviewCount,
      subtext: stats.pendingReviewCount > 0 ? 'Action required' : 'Queue clear',
      clickable: true,
      onClick: () => setActiveTab('review'),
    },
  ];

  return (
    <section className="bg-white border-b border-slate-200 py-4">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              onClick={metric.clickable ? metric.onClick : undefined}
              className={`flex flex-col ${metric.clickable ? 'cursor-pointer group' : ''}`}
            >
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {metric.label}
              </span>
              <span
                className={`text-2xl font-bold tabular-nums tracking-tight mt-1 ${
                  metric.highlight ? 'text-blue-700' : 'text-slate-900 group-hover:text-blue-600 transition-colors'
                }`}
              >
                {metric.value}
              </span>
              <span className="text-xs text-slate-500 mt-0.5 truncate">
                {metric.subtext}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
