import React, { useState, useMemo } from 'react';
import { useCivic } from '../context/CivicContext';
import { MunicipalMap } from './MunicipalMap';
import { Category, Department } from '../types';

export const DashboardView: React.FC = () => {
  const { complaints, issues, stats, setSelectedIssueId, setActiveTab } = useCivic();

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<Department | 'All'>('All');
  const [selectedCat, setSelectedCat] = useState<Category | 'All'>('All');

  // Filter complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const matchesSearch =
        search === '' ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.citizenRef.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        (c.linkedIssueId && c.linkedIssueId.toLowerCase().includes(search.toLowerCase()));

      const matchesDept = selectedDept === 'All' || c.department === selectedDept;
      const matchesCat = selectedCat === 'All' || c.category === selectedCat;

      return matchesSearch && matchesDept && matchesCat;
    });
  }, [complaints, search, selectedDept, selectedCat]);

  return (
    <div className="space-y-8">
      {/* Top Banner / Operational Problem Framing */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cross-Department Consolidation Engine
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              City Permit & Complaint Deduplication
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Consolidates duplicate citizen reports submitted through Public Works, Transportation, 311,
              and Code Compliance into verified underlying issues. Eliminates duplicate work orders and conflicting
              statuses while preserving citizen tracking visibility.
            </p>
          </div>

          {/* Quick Consolidation Efficiency Ratio */}
          <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-6">
            <div>
              <div className="text-xs text-slate-500">Raw Complaints (N)</div>
              <div className="text-xl font-bold tabular-nums text-slate-900">{stats.totalComplaints}</div>
            </div>
            <div className="text-slate-300 text-lg">→</div>
            <div>
              <div className="text-xs text-slate-500">Underlying Issues (U)</div>
              <div className="text-xl font-bold tabular-nums text-blue-700">{stats.uniqueIssues}</div>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <div className="text-xs text-slate-500">Workload Reduction</div>
              <div className="text-xl font-bold tabular-nums text-emerald-600">
                -{stats.consolidatedDuplicates} orders
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid: Geospatial Map + Department Workload Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <MunicipalMap />
        </div>

        {/* Department-wise workload distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Department Workload Impact</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparison of incoming complaint volume vs assigned underlying issues.
            </p>

            <div className="mt-4 space-y-4">
              {Object.entries(stats.departmentBreakdown).map(([dept, data]) => {
                const maxVol = Math.max(...Object.values(stats.departmentBreakdown).map(d => d.complaints), 1);
                const percent = Math.min(100, Math.round((data.complaints / maxVol) * 100));

                return (
                  <div key={dept} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">{dept}</span>
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="tabular-nums font-mono">{data.complaints} complaints</span>
                        <span>·</span>
                        <span className="tabular-nums font-mono text-blue-700 font-semibold">
                          {data.leadIssues} lead issues
                        </span>
                      </div>
                    </div>
                    {/* Visual proportion bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                      <div
                        className="bg-slate-400 h-full"
                        style={{ width: `${percent}%` }}
                      />
                      <div
                        className="bg-blue-600 h-full"
                        style={{ width: `${Math.min(100, (data.leadIssues / maxVol) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">Notice:</span> Unified 311 intake accounts for high citizen filing volume, while Public Works and Transportation shoulder physical resolution execution.
          </div>
        </div>
      </div>

      {/* Filterable Raw Complaints Ledger */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">All Registered Complaints</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every citizen submission is preserved with an anonymized reference and audit trail.
              </p>
            </div>
            <div className="text-xs text-slate-500 tabular-nums">
              Showing {filteredComplaints.length} of {complaints.length} records
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search description, ID, or citizen ref..."
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value as any)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
              >
                <option value="All">All Reporting Departments</option>
                <option value="Public Works">Public Works</option>
                <option value="Transportation">Transportation</option>
                <option value="Water Resources">Water Resources</option>
                <option value="Code Compliance">Code Compliance</option>
                <option value="Parks & Sanitation">Parks & Sanitation</option>
                <option value="311 Unified Contact Center">311 Unified Contact Center</option>
              </select>
            </div>
            <div>
              <select
                value={selectedCat}
                onChange={e => setSelectedCat(e.target.value as any)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
              >
                <option value="All">All Municipal Categories</option>
                <option value="Roads & Pavement">Roads & Pavement</option>
                <option value="Stormwater & Drainage">Stormwater & Drainage</option>
                <option value="Street Lighting & Signals">Street Lighting & Signals</option>
                <option value="Sanitation & Waste">Sanitation & Waste</option>
                <option value="Building & Zoning Permits">Building & Zoning Permits</option>
              </select>
            </div>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Complaint ID</th>
                <th className="py-3 px-4">Citizen Ref</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Intake Dept</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Consolidated Issue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No complaints matched your search or filters.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map(complaint => {
                  const linkedIssue = issues.find(i => i.id === complaint.linkedIssueId);

                  return (
                    <tr key={complaint.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {complaint.id}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {complaint.citizenRef}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-800" title={complaint.description}>
                        {complaint.description}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {complaint.category}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {complaint.department}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {complaint.location ? (
                          <span>{complaint.location.address}</span>
                        ) : (
                          <span className="text-amber-600 italic">No GPS coordinates</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="capitalize text-slate-700 font-medium">
                          {complaint.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {linkedIssue ? (
                          <button
                            onClick={() => {
                              setSelectedIssueId(linkedIssue.id);
                              setActiveTab('issues');
                            }}
                            className="font-mono text-blue-700 hover:text-blue-900 underline font-medium cursor-pointer"
                          >
                            {linkedIssue.id} ({linkedIssue.linkedComplaintIds.length})
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
