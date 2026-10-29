import React, { useState } from 'react';
import { useCivic } from '../context/CivicContext';
import { Department, IssueStatus } from '../types';

export const IssuesTrackerView: React.FC = () => {
  const {
    issues,
    complaints,
    selectedIssueId,
    setSelectedIssueId,
    updateIssueStatus,
    reopenIssue,
    unlinkComplaint,
  } = useCivic();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newStatusInput, setNewStatusInput] = useState<IssueStatus>('in_progress');
  const [actingDeptInput, setActingDeptInput] = useState<Department>('Public Works');
  const [actionNotesInput, setActionNotesInput] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ isConflict: boolean; message: string } | null>(null);

  const selectedIssue = issues.find(i => i.id === selectedIssueId) || issues[0];

  const filteredIssues = issues.filter(iss => {
    if (statusFilter === 'all') return true;
    return iss.status === statusFilter;
  });

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    const result = updateIssueStatus(
      selectedIssue.id,
      newStatusInput,
      actingDeptInput,
      actionNotesInput || 'Operational review completed.'
    );

    setActionFeedback(result);
    setActionNotesInput('');

    setTimeout(() => {
      setActionFeedback(null);
    }, 4000);
  };

  const handleReopen = () => {
    if (!selectedIssue) return;
    reopenIssue(
      selectedIssue.id,
      '311 Unified Contact Center',
      'Citizen re-reported issue post-resolution; physical inspection requested.'
    );
  };

  return (
    <div className="space-y-6">
      {/* View Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Underlying Municipal Issues Tracker
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Single consolidated work order records representing real-world physical incidents across city wards.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
          {['all', 'in_progress', 'assigned', 'under_review', 'resolved', 'reopened'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors capitalize cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Left Issue Selector Table, Right Issue Master Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Issues List (5 columns) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Issue Master Ledger</span>
            <span className="tabular-nums">{filteredIssues.length} active issues</span>
          </div>

          <div className="max-h-[700px] overflow-y-auto divide-y divide-slate-100">
            {filteredIssues.map(issue => {
              const isSelected = selectedIssue?.id === issue.id;

              return (
                <div
                  key={issue.id}
                  onClick={() => setSelectedIssueId(issue.id)}
                  className={`p-4 transition-colors cursor-pointer text-left ${
                    isSelected ? 'bg-blue-50/60 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{issue.id}</span>
                    <span className="text-xs capitalize font-medium text-slate-600">
                      {issue.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-slate-900 mt-1 line-clamp-2 leading-snug">
                    {issue.title}
                  </h4>

                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <span>{issue.category}</span>
                    <span>·</span>
                    <span className="tabular-nums font-mono font-medium text-blue-700">
                      {issue.linkedComplaintIds.length} complaints
                    </span>
                    <span>·</span>
                    <span className="capitalize">{issue.priority} Priority</span>
                  </div>

                  <div className="text-xs text-slate-400 mt-1 truncate">
                    Lead: {issue.leadDepartment} · {issue.location.address}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Issue Detail & Lifecycle Resolution Timeline (7 columns) */}
        {selectedIssue ? (
          <div className="lg:col-span-7 space-y-6">
            {/* Header Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-blue-700">{selectedIssue.id}</span>
                  <span className="text-xs text-slate-400">/</span>
                  <span className="text-xs text-slate-600 font-medium">{selectedIssue.category}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Current Status:</span>
                  <span className="font-semibold uppercase tracking-wider text-slate-900">
                    {selectedIssue.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">{selectedIssue.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                  <span>Location: <strong className="text-slate-700">{selectedIssue.location.address}</strong></span>
                  <span>·</span>
                  <span>Lead Dept: <strong className="text-slate-700">{selectedIssue.leadDepartment}</strong></span>
                  <span>·</span>
                  <span>Priority: <strong className="text-slate-700 capitalize">{selectedIssue.priority}</strong></span>
                </div>
              </div>

              {/* Department Multi-Source Involvement */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                <span className="font-semibold text-slate-700 block mb-1.5">
                  Multi-Department Complaint Distribution ({selectedIssue.linkedComplaintIds.length} Total):
                </span>
                <div className="flex flex-wrap gap-3 text-slate-600">
                  {Object.entries(selectedIssue.departmentCounts)
                    .filter(([_, count]) => count > 0)
                    .map(([dept, count]) => (
                      <span key={dept} className="font-mono tabular-nums">
                        {dept}: <strong className="text-slate-900">{count}</strong>
                      </span>
                    ))}
                </div>
              </div>

              {/* Action Form: Update Status & Simulate Department Authority */}
              <form onSubmit={handleUpdateStatus} className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Log Lifecycle Event / Department Update
                  </span>
                  {selectedIssue.status === 'resolved' && (
                    <button
                      type="button"
                      onClick={handleReopen}
                      className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                    >
                      Reopen Issue (Simulate Recurrence)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Target Status</label>
                    <select
                      value={newStatusInput}
                      onChange={e => setNewStatusInput(e.target.value as IssueStatus)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    >
                      <option value="under_review">Under Review</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="reopened">Reopened</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Acting Department</label>
                    <select
                      value={actingDeptInput}
                      onChange={e => setActingDeptInput(e.target.value as Department)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    >
                      <option value="Public Works">Public Works</option>
                      <option value="Transportation">Transportation</option>
                      <option value="Water Resources">Water Resources</option>
                      <option value="Code Compliance">Code Compliance</option>
                      <option value="Parks & Sanitation">Parks & Sanitation</option>
                      <option value="311 Unified Contact Center">311 Unified Contact Center</option>
                    </select>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={actionNotesInput}
                    onChange={e => setActionNotesInput(e.target.value)}
                    placeholder="Work crew notes, inspection findings, contractor reference..."
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Lead Authority: <span className="font-medium text-slate-700">{selectedIssue.leadDepartment}</span>
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Commit Status Update
                  </button>
                </div>

                {actionFeedback && (
                  <div
                    className={`p-3 rounded-lg text-xs border ${
                      actionFeedback.isConflict
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    {actionFeedback.message}
                  </div>
                )}
              </form>
            </div>

            {/* Linked Complaints Table with Unlinking */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Linked Individual Citizen Reports ({selectedIssue.linkedComplaintIds.length})
                </span>
                <span className="text-slate-500">
                  Consolidated without deleting individual citizen records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-white">
                      <th className="py-2.5 px-4">Complaint ID</th>
                      <th className="py-2.5 px-4">Citizen Ref</th>
                      <th className="py-2.5 px-4">Intake Dept</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedIssue.linkedComplaintIds.map(cId => {
                      const comp = complaints.find(c => c.id === cId);
                      if (!comp) return null;

                      return (
                        <tr key={cId} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                            {comp.id}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {comp.citizenRef}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                            {comp.department}
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 max-w-xs truncate" title={comp.description}>
                            {comp.description}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            {selectedIssue.linkedComplaintIds.length > 1 && (
                              <button
                                onClick={() => unlinkComplaint(selectedIssue.id, comp.id)}
                                className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer"
                                title="Separate mistaken duplicate (Edge Case 4)"
                              >
                                Unlink
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resolution Event History Timeline */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h4 className="text-sm font-semibold text-slate-900 mb-4">
                Audit Trail & Resolution Event Timeline
              </h4>

              <div className="relative border-l border-slate-200 pl-4 space-y-4 text-xs">
                {selectedIssue.resolutionEvents.map((evt, idx) => {
                  const isConflict = evt.eventType === 'conflict_flagged';
                  const isReopen = evt.eventType === 'reopened';
                  const isResolved = evt.eventType === 'resolved';

                  return (
                    <div key={idx} className="relative group">
                      {/* Timeline marker */}
                      <div
                        className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          isConflict
                            ? 'bg-amber-600'
                            : isReopen
                            ? 'bg-red-600'
                            : isResolved
                            ? 'bg-emerald-600'
                            : 'bg-blue-600'
                        }`}
                      />
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-semibold text-slate-800 uppercase tracking-wider">
                          {evt.eventType.replace('_', ' ')} · {evt.actingDepartment}
                        </span>
                        <span className="tabular-nums font-mono">
                          {new Date(evt.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        {evt.notes}
                      </p>
                      <div className="text-slate-400 mt-0.5">
                        Actor: {evt.actorName}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
