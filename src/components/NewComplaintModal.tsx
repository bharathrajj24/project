import React, { useState, useMemo } from 'react';
import { useCivic } from '../context/CivicContext';
import { Category, Department } from '../types';
import { findBestCandidateIssue } from '../lib/deduplication';

interface NewComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: Category[] = [
  'Roads & Pavement',
  'Stormwater & Drainage',
  'Street Lighting & Signals',
  'Sanitation & Waste',
  'Building & Zoning Permits',
];

const DEPARTMENTS: Department[] = [
  'Public Works',
  'Transportation',
  'Water Resources',
  'Code Compliance',
  'Parks & Sanitation',
  '311 Unified Contact Center',
];

export const NewComplaintModal: React.FC<NewComplaintModalProps> = ({ isOpen, onClose }) => {
  const { submitComplaint, issues, prototypeThreshold, reviewThreshold } = useCivic();

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Roads & Pavement');
  const [department, setDepartment] = useState<Department>('311 Unified Contact Center');
  const [address, setAddress] = useState('450 Elm St, Ward 3');
  const [simulateMissingLocation, setSimulateMissingLocation] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    outcome: string;
    details: string;
  } | null>(null);

  // Real-time live duplicate scoring preview
  const liveMatchPreview = useMemo(() => {
    if (!description.trim() || description.length < 5) return null;

    const mockComplaint = {
      id: 'PREVIEW-TEMP',
      citizenRef: 'CIT-TEMP',
      description,
      category,
      location: simulateMissingLocation
        ? undefined
        : { lat: 37.774929, lng: -122.419416, address },
      timestamp: new Date().toISOString(),
      department,
      status: 'received' as const,
    };

    return findBestCandidateIssue(mockComplaint, issues, prototypeThreshold, reviewThreshold);
  }, [description, category, department, address, simulateMissingLocation, issues, prototypeThreshold, reviewThreshold]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const locationData = simulateMissingLocation
      ? undefined
      : {
          lat: 37.7749 + (Math.random() - 0.5) * 0.01,
          lng: -122.4194 + (Math.random() - 0.5) * 0.01,
          address: address.trim() || 'Reported Corridor, Ward 3',
        };

    const result = submitComplaint({
      description: description.trim(),
      category,
      department,
      location: locationData,
      citizenRef: `CIT-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    if (result.outcome === 'auto_merged') {
      setSubmissionFeedback({
        outcome: 'Duplicate Consolidated',
        details: `Report automatically consolidated into existing issue ${result.match?.candidateIssueId} (${((result.match?.overallScore || 0) * 100).toFixed(0)}% confidence score). Citizen tracking preserved without duplicate work orders.`,
      });
    } else if (result.outcome === 'queued_for_review') {
      setSubmissionFeedback({
        outcome: 'Routed to Review Queue',
        details: `Ambiguous match detected (${((result.match?.overallScore || 0) * 100).toFixed(0)}% score). Escalated to municipal review queue to prevent incorrect merge.`,
      });
    } else {
      setSubmissionFeedback({
        outcome: 'New Underlying Issue Created',
        details: `No existing duplicate detected. New municipal issue record spawned with Lead Department assigned.`,
      });
    }

    // Reset form after delay or when acknowledged
    setTimeout(() => {
      setDescription('');
      setSubmissionFeedback(null);
      onClose();
    }, 2400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Intake New Complaint Report</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulates multi-department intake with instant deduplication pipeline scoring.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {submissionFeedback ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h4 className="text-lg font-bold text-slate-900">{submissionFeedback.outcome}</h4>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {submissionFeedback.details}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Complaint Description *
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Deep pothole on Elm St breaking vehicle rims near 450 Elm..."
                rows={3}
                required
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as Category)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Reporting Department
                </label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value as Department)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Location / Street Address
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulateMissingLocation}
                    onChange={e => setSimulateMissingLocation(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0"
                  />
                  <span>Simulate Missing GPS (Edge Case 1)</span>
                </label>
              </div>
              <input
                type="text"
                value={address}
                disabled={simulateMissingLocation}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g. 450 Elm St, Ward 3"
                className={`w-full text-sm border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-none ${
                  simulateMissingLocation ? 'bg-slate-100 text-slate-400' : 'bg-white'
                }`}
              />
            </div>

            {/* Live Duplicate Analysis Banner */}
            {liveMatchPreview && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Pre-Submission Deduplication Match:</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {(liveMatchPreview.overallScore * 100).toFixed(0)}% Match
                  </span>
                </div>
                <div className="text-slate-600">
                  Target: <span className="font-medium text-slate-900">{liveMatchPreview.candidateIssueId}</span>
                  {' '}· Status: <span className="capitalize">{liveMatchPreview.matchTier.replace('_', ' ')}</span>
                </div>
                <p className="text-slate-500 italic">
                  {liveMatchPreview.explainability[0]}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
              >
                Submit & Deduplicate
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
