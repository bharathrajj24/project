import React, { useState } from 'react';
import { useCivic } from '../context/CivicContext';

export const ReviewQueueView: React.FC = () => {
  const { reviewQueue, complaints, issues, approveReviewMatch, rejectReviewMatch } = useCivic();
  const [rejectReason, setRejectReason] = useState<string>('Unrelated problem at nearby address');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Deduplication Human-in-the-Loop Review Queue
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Borderline candidate matches requiring supervisor adjudication to prevent false-positive merges.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono tabular-nums">
          {reviewQueue.length} Pending Adjudications
        </div>
      </div>

      {reviewQueue.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
            ✓
          </div>
          <h3 className="text-base font-semibold text-slate-900">Review Queue is Clear</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All incoming reports either exceeded the high-confidence auto-merge threshold (75%+) or were automatically established as distinct municipal issues.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviewQueue.map(match => {
            const incomingComp = complaints.find(c => c.id === match.complaintId);
            const candidateIssue = issues.find(i => i.id === match.candidateIssueId);

            if (!incomingComp || !candidateIssue) return null;

            return (
              <div
                key={match.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
              >
                {/* Header Strip with Score */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-900">{match.id}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Uncertain Match Tier (Review Required)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Composite Score:</span>
                    <span className="font-mono text-base font-bold tabular-nums text-blue-700">
                      {(match.overallScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Side-by-Side Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    {/* Left: Incoming Complaint */}
                    <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">Incoming Complaint</span>
                          <span className="font-mono font-bold text-slate-900">{incomingComp.id}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 leading-snug">
                          {incomingComp.description}
                        </p>
                        <div className="text-xs text-slate-500 pt-2 border-t border-slate-200 space-y-1">
                          <div>Category: <strong className="text-slate-700">{incomingComp.category}</strong></div>
                          <div>Intake Dept: <strong className="text-slate-700">{incomingComp.department}</strong></div>
                          <div>Location: <strong className="text-slate-700">{incomingComp.location?.address || 'Missing GPS'}</strong></div>
                          <div>Citizen Ref: <strong className="text-slate-700">{incomingComp.citizenRef}</strong></div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Candidate Underlying Issue */}
                    <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/30 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-blue-900">
                          <span className="font-semibold text-blue-800">Candidate Existing Issue</span>
                          <span className="font-mono font-bold text-blue-700">{candidateIssue.id}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 leading-snug">
                          {candidateIssue.title}
                        </p>
                        <div className="text-xs text-slate-500 pt-2 border-t border-blue-100 space-y-1">
                          <div>Category: <strong className="text-slate-700">{candidateIssue.category}</strong></div>
                          <div>Lead Dept: <strong className="text-slate-700">{candidateIssue.leadDepartment}</strong></div>
                          <div>Centroid: <strong className="text-slate-700">{candidateIssue.location.address}</strong></div>
                          <div>Currently Linked: <strong className="text-slate-700">{candidateIssue.linkedComplaintIds.length} complaints</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Signal Breakdown Meters */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                      Multi-Signal Feature Scores
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-slate-500">Text Similarity</div>
                        <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                          {(match.featureScores.textSimilarity * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">NLP token overlap</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-slate-500">Geospatial Distance</div>
                        <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                          {match.featureScores.geoDistanceMeters !== null
                            ? `${match.featureScores.geoDistanceMeters}m`
                            : 'N/A (Missing)'}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Geo score: {(match.featureScores.geoScore * 100).toFixed(0)}%
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-slate-500">Category Compatibility</div>
                        <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                          {(match.featureScores.categoryCompatibility * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">Cross-dept matrix</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-slate-500">Temporal Proximity</div>
                        <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                          {(match.featureScores.temporalScore * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">Time gap decay</div>
                      </div>
                    </div>
                  </div>

                  {/* Explainable Reasoning Output */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                      Explainable Reasoning
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                      {match.explainability.map((exp, i) => (
                        <li key={i}>{exp}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Adjudication Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <select
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        className="text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-700 focus:outline-none"
                      >
                        <option value="Unrelated problem at nearby address">Separate: Unrelated nearby problem</option>
                        <option value="Different issue category despite similar wording">Separate: Different category</option>
                        <option value="Distinct physical site requires independent crew">Separate: Distinct physical site</option>
                      </select>
                      <button
                        onClick={() => rejectReviewMatch(match.id, rejectReason)}
                        className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Reject & Create Separate Issue
                      </button>
                    </div>

                    <button
                      onClick={() => approveReviewMatch(match.id)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Approve & Consolidate into {candidateIssue.id}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
