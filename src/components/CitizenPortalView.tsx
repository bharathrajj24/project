import React, { useState } from 'react';
import { useCivic } from '../context/CivicContext';
import { Category } from '../types';

export const CitizenPortalView: React.FC = () => {
  const { complaints, issues, submitComplaint } = useCivic();

  const [lookupId, setLookupId] = useState('CMP-2026-1011');
  const [searchedComplaintId, setSearchedComplaintId] = useState<string | null>('CMP-2026-1011');
  
  // Public intake state
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState<Category>('Roads & Pavement');
  const [addr, setAddr] = useState('450 Elm St');
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  const complaint = complaints.find(
    c => c.id.toLowerCase() === (searchedComplaintId || '').trim().toLowerCase()
  );

  const linkedIssue = complaint?.linkedIssueId
    ? issues.find(i => i.id === complaint.linkedIssueId)
    : null;

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchedComplaintId(lookupId.trim());
  };

  const handlePublicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;

    const result = submitComplaint({
      description: desc.trim(),
      category: cat,
      department: '311 Unified Contact Center',
      location: { lat: 37.7749, lng: -122.4194, address: addr },
      citizenRef: `CIT-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    setSubmissionSuccess(
      `Your report has been registered under Complaint ID: ${result.complaint.id}. ` +
      (result.outcome === 'auto_merged'
        ? `It was linked to existing municipal work order ${result.match?.candidateIssueId}, combining public priority!`
        : `A new municipal issue record was initiated for your neighborhood.`)
    );

    setLookupId(result.complaint.id);
    setSearchedComplaintId(result.complaint.id);
    setDesc('');

    setTimeout(() => {
      setSubmissionSuccess(null);
    }, 8000);
  };

  return (
    <div className="space-y-8">
      {/* Citizen Privacy Notice & Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="max-w-2xl space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Citizen Transparency Portal
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Track the status of your municipal complaint in real-time. CivicMerge connects your individual report
            to the city's active work orders without exposing personal citizen information or contact details.
          </p>
        </div>
      </section>

      {/* Grid: Left Lookup Tool, Right Tracked Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Complaint Lookup & Public Filing (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Lookup Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900">Look Up Existing Report</h3>
            <form onSubmit={handleLookup} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Complaint Tracking ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={lookupId}
                    onChange={e => setLookupId(e.target.value)}
                    placeholder="e.g. CMP-2026-1011"
                    className="flex-1 text-sm border border-slate-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Track
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span>Sample IDs:</span>
                {['CMP-2026-1011', 'CMP-2026-1021', 'CMP-2026-1031'].map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setLookupId(id);
                      setSearchedComplaintId(id);
                    }}
                    className="font-mono text-blue-700 hover:underline cursor-pointer"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Citizen Direct Submission Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900">Submit a Neighborhood Report</h3>
            {submissionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 leading-relaxed">
                {submissionSuccess}
              </div>
            )}
            <form onSubmit={handlePublicSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">What did you observe?</label>
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Describe the damaged pavement, broken light, drainage overflow..."
                  rows={3}
                  required
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Category</label>
                <select
                  value={cat}
                  onChange={e => setCat(e.target.value as Category)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:outline-none"
                >
                  <option value="Roads & Pavement">Roads & Pavement</option>
                  <option value="Stormwater & Drainage">Stormwater & Drainage</option>
                  <option value="Street Lighting & Signals">Street Lighting & Signals</option>
                  <option value="Sanitation & Waste">Sanitation & Waste</option>
                  <option value="Building & Zoning Permits">Building & Zoning Permits</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Street Address or Cross Street</label>
                <input
                  type="text"
                  value={addr}
                  onChange={e => setAddr(e.target.value)}
                  placeholder="e.g. 450 Elm St"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Submit Citizen Report
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Tracked Status & Unified Issue Resolution (7 cols) */}
        <div className="lg:col-span-7">
          {complaint ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-xs">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs text-slate-400">Citizen Filing Reference</div>
                  <div className="font-mono text-base font-bold text-slate-900">
                    {complaint.id} <span className="text-slate-400 font-normal">({complaint.citizenRef})</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Filing Status</div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    {complaint.status.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Report Summary */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Original Report
                </span>
                <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  "{complaint.description}"
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                  <span>Category: <strong className="text-slate-700">{complaint.category}</strong></span>
                  <span>·</span>
                  <span>Intake Agency: <strong className="text-slate-700">{complaint.department}</strong></span>
                  <span>·</span>
                  <span>Submitted: <strong className="text-slate-700">{new Date(complaint.timestamp).toLocaleDateString()}</strong></span>
                </div>
              </div>

              {/* Consolidated Municipal Issue Link */}
              {linkedIssue ? (
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
                      Consolidated City Work Order
                    </span>
                    <span className="font-mono text-xs font-bold text-blue-700">
                      {linkedIssue.id}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">
                    {linkedIssue.title}
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-blue-100">
                    <div>
                      <div className="text-slate-500">Lead Responsible Crew:</div>
                      <div className="font-semibold text-slate-800">{linkedIssue.leadDepartment}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Work Order Status:</div>
                      <div className="font-semibold text-slate-800 capitalize">{linkedIssue.status.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Community Reports:</div>
                      <div className="font-semibold text-blue-700 tabular-nums">
                        {linkedIssue.linkedComplaintIds.length} citizens corroborating
                      </div>
                    </div>
                  </div>

                  {linkedIssue.resolutionNotes && (
                    <div className="text-xs text-slate-600 bg-white p-2.5 rounded border border-blue-100">
                      <strong className="text-slate-800">Dispatch Notes: </strong>
                      {linkedIssue.resolutionNotes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  This complaint is currently undergoing municipal intake assessment and will be linked to a responsible crew shortly.
                </div>
              )}

              {/* Public Resolution Timeline */}
              {linkedIssue && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                    Public Resolution Activity
                  </span>
                  <div className="relative border-l border-slate-200 pl-4 space-y-3 text-xs">
                    {linkedIssue.resolutionEvents
                      .filter(e => e.eventType !== 'conflict_flagged') // Don't expose internal technical conflicts to citizens
                      .map((evt, idx) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white" />
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="font-semibold text-slate-800 uppercase tracking-wider">
                              {evt.eventType.replace('_', ' ')} · {evt.actingDepartment}
                            </span>
                            <span className="font-mono tabular-nums">
                              {new Date(evt.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">
                            {evt.notes}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs">
              Complaint record <span className="font-mono font-bold text-slate-700">{searchedComplaintId}</span> was not found. Please verify the ID or try one of the samples above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
