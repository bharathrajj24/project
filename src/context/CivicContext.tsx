/**
 * CivicMerge Application State & Store Context
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { generateSyntheticDataset } from '../data/syntheticDataset';
import { runBenchmarkEvaluation, EvaluationReport } from '../lib/evaluation';
import { runAllEdgeCaseTests } from '../lib/edgeCases';
import {
  scoreCandidateMatch,
  evaluateResolvedIssuePolicy,
  resolveDepartmentStatusConflict,
  findBestCandidateIssue,
} from '../lib/deduplication';
import {
  Category,
  Complaint,
  DeduplicationMatch,
  Department,
  EdgeCaseResult,
  Issue,
  IssueStatus,
  ResolutionEvent,
} from '../types';

interface CivicContextType {
  complaints: Complaint[];
  issues: Issue[];
  reviewQueue: DeduplicationMatch[];
  evaluationReport: EvaluationReport;
  edgeCaseResults: EdgeCaseResult[];
  activeTab: 'dashboard' | 'issues' | 'review' | 'citizen' | 'benchmark' | 'deliverables';
  setActiveTab: (tab: 'dashboard' | 'issues' | 'review' | 'citizen' | 'benchmark' | 'deliverables') => void;
  selectedIssueId: string | null;
  setSelectedIssueId: (id: string | null) => void;
  prototypeThreshold: number;
  setPrototypeThreshold: (th: number) => void;
  reviewThreshold: number;
  setReviewThreshold: (th: number) => void;
  
  // Operational Actions
  submitComplaint: (data: Partial<Complaint>) => {
    complaint: Complaint;
    match: DeduplicationMatch | null;
    outcome: 'auto_merged' | 'queued_for_review' | 'new_issue_created';
  };
  approveReviewMatch: (matchId: string) => void;
  rejectReviewMatch: (matchId: string, reason?: string) => void;
  unlinkComplaint: (issueId: string, complaintId: string) => void;
  updateIssueStatus: (
    issueId: string,
    newStatus: IssueStatus,
    actingDepartment: Department,
    notes: string,
    actorName?: string
  ) => { isConflict: boolean; message: string };
  reopenIssue: (issueId: string, actingDept: Department, reason: string) => void;
  runBenchmarks: (threshold?: number) => void;
  runEdgeCases: () => void;
  resetToInitialData: () => void;
  
  // Computed stats
  stats: {
    totalComplaints: number;
    uniqueIssues: number;
    consolidatedDuplicates: number;
    consolidationRate: number;
    pendingReviewCount: number;
    resolvedIssuesCount: number;
    reopenedIssuesCount: number;
    inProgressIssuesCount: number;
    departmentBreakdown: Record<Department, { complaints: number; leadIssues: number }>;
  };
}

const CivicContext = createContext<CivicContextType | undefined>(undefined);

export const CivicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [reviewQueue, setReviewQueue] = useState<DeduplicationMatch[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'issues' | 'review' | 'citizen' | 'benchmark' | 'deliverables'>('dashboard');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [prototypeThreshold, setPrototypeThreshold] = useState<number>(0.75);
  const [reviewThreshold, setReviewThreshold] = useState<number>(0.50);
  const [evaluationReport, setEvaluationReport] = useState<EvaluationReport>(() => runBenchmarkEvaluation(0.75));
  const [edgeCaseResults, setEdgeCaseResults] = useState<EdgeCaseResult[]>(() => runAllEdgeCaseTests());

  // Initialize dataset
  const resetToInitialData = () => {
    const dataset = generateSyntheticDataset(42);
    setComplaints(dataset.complaints);
    setIssues(dataset.initialIssues);

    // Initial review queue: find complaints that need review (e.g. ambiguous case CMP-2026-2005)
    const initialQueue: DeduplicationMatch[] = [];
    const ambiguousComplaint = dataset.complaints.find(c => c.id === 'CMP-2026-2005');
    const drainageIssue = dataset.initialIssues.find(i => i.id === 'ISS-2026-002');
    
    if (ambiguousComplaint && drainageIssue) {
      const match = scoreCandidateMatch(ambiguousComplaint, drainageIssue, 0.75, 0.50);
      match.matchTier = 'review_needed';
      initialQueue.push(match);
    }

    setReviewQueue(initialQueue);
    setEvaluationReport(runBenchmarkEvaluation(0.75));
    setEdgeCaseResults(runAllEdgeCaseTests());
  };

  useEffect(() => {
    resetToInitialData();
  }, []);

  const runBenchmarks = (th = prototypeThreshold) => {
    const report = runBenchmarkEvaluation(th);
    setEvaluationReport(report);
  };

  const runEdgeCases = () => {
    const results = runAllEdgeCaseTests();
    setEdgeCaseResults(results);
  };

  // Submit a complaint from citizen or intake department
  const submitComplaint = (data: Partial<Complaint>): {
    complaint: Complaint;
    match: DeduplicationMatch | null;
    outcome: 'auto_merged' | 'queued_for_review' | 'new_issue_created';
  } => {
    const newId = `CMP-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const newCitizenRef = data.citizenRef || `CIT-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const newTimestamp = data.timestamp || new Date().toISOString();

    const newComplaint: Complaint = {
      id: newId,
      citizenRef: newCitizenRef,
      description: data.description || 'No description provided',
      category: data.category || 'Roads & Pavement',
      location: data.location,
      timestamp: newTimestamp,
      department: data.department || '311 Unified Contact Center',
      status: 'received',
      syntheticImageUrl: data.syntheticImageUrl,
      imageFeatureHash: data.imageFeatureHash,
      notes: data.notes,
    };

    // Run against active issues
    const bestMatch = findBestCandidateIssue(newComplaint, issues, prototypeThreshold, reviewThreshold);

    if (bestMatch && bestMatch.matchTier === 'auto_merge') {
      const targetIssue = issues.find(i => i.id === bestMatch.candidateIssueId);

      if (targetIssue) {
        // Check lifecycle policy if issue was resolved
        if (targetIssue.status === 'resolved') {
          const policy = evaluateResolvedIssuePolicy(targetIssue, newComplaint, bestMatch.overallScore);
          if (policy.action === 'reopen') {
            // Reopen issue
            const updatedIssue: Issue = {
              ...targetIssue,
              status: 'reopened',
              lastReportedAt: newTimestamp,
              linkedComplaintIds: [...targetIssue.linkedComplaintIds, newId],
              departmentCounts: {
                ...targetIssue.departmentCounts,
                [newComplaint.department]: (targetIssue.departmentCounts[newComplaint.department] || 0) + 1,
              },
              resolutionEvents: [
                ...targetIssue.resolutionEvents,
                {
                  id: `EVT-${Date.now()}`,
                  timestamp: newTimestamp,
                  eventType: 'reopened',
                  actingDepartment: newComplaint.department,
                  notes: `Reopened upon receipt of complaint ${newId}: ${policy.reasoning}`,
                  actorName: 'CivicMerge Lifecycle Engine',
                },
              ],
            };

            newComplaint.status = 'linked';
            newComplaint.linkedIssueId = targetIssue.id;

            setIssues(prev => prev.map(iss => iss.id === targetIssue.id ? updatedIssue : iss));
            setComplaints(prev => [newComplaint, ...prev]);
            return { complaint: newComplaint, match: bestMatch, outcome: 'auto_merged' };
          }
        }

        // Standard auto-merge into open issue
        const updatedIssue: Issue = {
          ...targetIssue,
          lastReportedAt: newTimestamp,
          linkedComplaintIds: [...targetIssue.linkedComplaintIds, newId],
          departmentCounts: {
            ...targetIssue.departmentCounts,
            [newComplaint.department]: (targetIssue.departmentCounts[newComplaint.department] || 0) + 1,
          },
          resolutionEvents: [
            ...targetIssue.resolutionEvents,
            {
              id: `EVT-${Date.now()}`,
              timestamp: newTimestamp,
              eventType: 'triaged',
              actingDepartment: newComplaint.department,
              notes: `Linked duplicate report ${newId} with ${(bestMatch.overallScore * 100).toFixed(0)}% confidence score.`,
              actorName: 'CivicMerge Auto-Matcher',
            },
          ],
        };

        newComplaint.status = 'linked';
        newComplaint.linkedIssueId = targetIssue.id;

        setIssues(prev => prev.map(iss => iss.id === targetIssue.id ? updatedIssue : iss));
        setComplaints(prev => [newComplaint, ...prev]);
        return { complaint: newComplaint, match: bestMatch, outcome: 'auto_merged' };
      }
    }

    if (bestMatch && bestMatch.matchTier === 'review_needed') {
      // Route to review queue
      newComplaint.status = 'under_triage';
      setReviewQueue(prev => [bestMatch, ...prev]);
      setComplaints(prev => [newComplaint, ...prev]);
      return { complaint: newComplaint, match: bestMatch, outcome: 'queued_for_review' };
    }

    // No match -> create fresh underlying issue
    const newIssueId = `ISS-2026-${String(Math.floor(100 + Math.random() * 900))}`;
    const newIssue: Issue = {
      id: newIssueId,
      title: `${newComplaint.category} issue reported at ${newComplaint.location?.address || 'Municipal Ward'}`,
      category: newComplaint.category,
      leadDepartment: newComplaint.department === '311 Unified Contact Center' ? 'Public Works' : newComplaint.department,
      priority: 'medium',
      status: 'reported',
      location: newComplaint.location || { lat: 37.7749, lng: -122.4194, address: 'Reported Location' },
      linkedComplaintIds: [newId],
      departmentCounts: {
        'Public Works': 0,
        'Transportation': 0,
        'Water Resources': 0,
        'Code Compliance': 0,
        'Parks & Sanitation': 0,
        '311 Unified Contact Center': 0,
        [newComplaint.department]: 1,
      },
      firstReportedAt: newTimestamp,
      lastReportedAt: newTimestamp,
      resolutionEvents: [
        {
          id: `EVT-${Date.now()}`,
          timestamp: newTimestamp,
          eventType: 'reported',
          actingDepartment: newComplaint.department,
          notes: `Initial municipal report registered as underlying issue ${newIssueId}.`,
          actorName: 'Intake Gateway',
        },
      ],
    };

    newComplaint.status = 'linked';
    newComplaint.linkedIssueId = newIssueId;

    setIssues(prev => [newIssue, ...prev]);
    setComplaints(prev => [newComplaint, ...prev]);
    return { complaint: newComplaint, match: bestMatch, outcome: 'new_issue_created' };
  };

  // Review Queue approval
  const approveReviewMatch = (matchId: string) => {
    const match = reviewQueue.find(m => m.id === matchId);
    if (!match) return;

    const targetIssue = issues.find(i => i.id === match.candidateIssueId);
    const complaint = complaints.find(c => c.id === match.complaintId);
    if (!targetIssue || !complaint) return;

    const now = new Date().toISOString();
    const updatedIssue: Issue = {
      ...targetIssue,
      linkedComplaintIds: [...targetIssue.linkedComplaintIds, complaint.id],
      departmentCounts: {
        ...targetIssue.departmentCounts,
        [complaint.department]: (targetIssue.departmentCounts[complaint.department] || 0) + 1,
      },
      resolutionEvents: [
        ...targetIssue.resolutionEvents,
        {
          id: `EVT-${Date.now()}`,
          timestamp: now,
          eventType: 'triaged',
          actingDepartment: complaint.department,
          notes: `Reviewer approved merge of complaint ${complaint.id} (${(match.overallScore * 100).toFixed(0)}% score).`,
          actorName: 'Municipal Reviewer',
        },
      ],
    };

    setIssues(prev => prev.map(iss => iss.id === targetIssue.id ? updatedIssue : iss));
    setComplaints(prev =>
      prev.map(c => (c.id === complaint.id ? { ...c, status: 'linked', linkedIssueId: targetIssue.id } : c))
    );
    setReviewQueue(prev => prev.filter(m => m.id !== matchId));
  };

  // Review Queue rejection: separates complaint into its own distinct issue
  const rejectReviewMatch = (matchId: string, reason = 'Reviewer confirmed non-duplicate') => {
    const match = reviewQueue.find(m => m.id === matchId);
    if (!match) return;

    const complaint = complaints.find(c => c.id === match.complaintId);
    if (!complaint) return;

    const newIssueId = `ISS-2026-${String(Math.floor(100 + Math.random() * 900))}`;
    const newIssue: Issue = {
      id: newIssueId,
      title: `${complaint.category}: ${complaint.description.substring(0, 50)}...`,
      category: complaint.category,
      leadDepartment: complaint.department === '311 Unified Contact Center' ? 'Public Works' : complaint.department,
      priority: 'medium',
      status: 'reported',
      location: complaint.location || { lat: 37.7749, lng: -122.4194, address: 'Reported Location' },
      linkedComplaintIds: [complaint.id],
      departmentCounts: {
        'Public Works': 0,
        'Transportation': 0,
        'Water Resources': 0,
        'Code Compliance': 0,
        'Parks & Sanitation': 0,
        '311 Unified Contact Center': 0,
        [complaint.department]: 1,
      },
      firstReportedAt: complaint.timestamp,
      lastReportedAt: complaint.timestamp,
      resolutionEvents: [
        {
          id: `EVT-${Date.now()}`,
          timestamp: new Date().toISOString(),
          eventType: 'reported',
          actingDepartment: complaint.department,
          notes: `Separated from proposed merge: ${reason}. Spawned independent issue ${newIssueId}.`,
          actorName: 'Review Desk',
        },
      ],
    };

    setIssues(prev => [newIssue, ...prev]);
    setComplaints(prev =>
      prev.map(c => (c.id === complaint.id ? { ...c, status: 'linked', linkedIssueId: newIssueId } : c))
    );
    setReviewQueue(prev => prev.filter(m => m.id !== matchId));
  };

  // Unlink a mistakenly linked complaint from an issue
  const unlinkComplaint = (issueId: string, complaintId: string) => {
    const targetIssue = issues.find(i => i.id === issueId);
    const complaint = complaints.find(c => c.id === complaintId);
    if (!targetIssue || !complaint) return;

    const updatedLinked = targetIssue.linkedComplaintIds.filter(id => id !== complaintId);
    const updatedDeptCounts = { ...targetIssue.departmentCounts };
    if (updatedDeptCounts[complaint.department] > 0) {
      updatedDeptCounts[complaint.department]--;
    }

    const updatedIssue: Issue = {
      ...targetIssue,
      linkedComplaintIds: updatedLinked,
      departmentCounts: updatedDeptCounts,
      resolutionEvents: [
        ...targetIssue.resolutionEvents,
        {
          id: `EVT-${Date.now()}`,
          timestamp: new Date().toISOString(),
          eventType: 'triaged',
          actingDepartment: complaint.department,
          notes: `Complaint ${complaintId} unlinked and separated by supervisor.`,
          actorName: 'Operations Lead',
        },
      ],
    };

    // Create independent issue for unlinked complaint
    const newIssueId = `ISS-2026-${String(Math.floor(100 + Math.random() * 900))}`;
    const newIssue: Issue = {
      id: newIssueId,
      title: `${complaint.category}: ${complaint.description.substring(0, 50)}`,
      category: complaint.category,
      leadDepartment: complaint.department === '311 Unified Contact Center' ? 'Public Works' : complaint.department,
      priority: 'low',
      status: 'reported',
      location: complaint.location || targetIssue.location,
      linkedComplaintIds: [complaint.id],
      departmentCounts: {
        'Public Works': 0,
        'Transportation': 0,
        'Water Resources': 0,
        'Code Compliance': 0,
        'Parks & Sanitation': 0,
        '311 Unified Contact Center': 0,
        [complaint.department]: 1,
      },
      firstReportedAt: complaint.timestamp,
      lastReportedAt: complaint.timestamp,
      resolutionEvents: [
        {
          id: `EVT-${Date.now()}`,
          timestamp: new Date().toISOString(),
          eventType: 'reported',
          actingDepartment: complaint.department,
          notes: `Standalone issue established following decoupling from ${issueId}.`,
          actorName: 'Audit Coordinator',
        },
      ],
    };

    setIssues(prev => [newIssue, ...prev.map(iss => iss.id === issueId ? updatedIssue : iss)]);
    setComplaints(prev =>
      prev.map(c => (c.id === complaintId ? { ...c, linkedIssueId: newIssueId } : c))
    );
  };

  // Multi-department status updates with conflict resolution
  const updateIssueStatus = (
    issueId: string,
    newStatus: IssueStatus,
    actingDepartment: Department,
    notes: string,
    actorName = 'City Staff'
  ) => {
    const targetIssue = issues.find(i => i.id === issueId);
    if (!targetIssue) return { isConflict: false, message: 'Issue not found' };

    const conflictResult = resolveDepartmentStatusConflict(targetIssue, actingDepartment, newStatus, notes);

    const now = new Date().toISOString();
    const eventType: ResolutionEvent['eventType'] = conflictResult.isConflict
      ? 'conflict_flagged'
      : (newStatus === 'resolved' ? 'resolved' : newStatus === 'in_progress' ? 'in_progress' : 'assigned');

    const newEvent: ResolutionEvent = {
      id: `EVT-${Date.now()}`,
      timestamp: now,
      eventType,
      actingDepartment,
      notes: conflictResult.resolutionNote + (notes ? ` Additional notes: ${notes}` : ''),
      actorName,
    };

    const updatedIssue: Issue = {
      ...targetIssue,
      status: conflictResult.finalStatus,
      resolutionNotes: notes || targetIssue.resolutionNotes,
      resolutionEvents: [...targetIssue.resolutionEvents, newEvent],
    };

    setIssues(prev => prev.map(iss => iss.id === issueId ? updatedIssue : iss));

    // Decoupled complaint-level update: update complaint status to match resolved if issue resolved
    if (conflictResult.finalStatus === 'resolved') {
      setComplaints(prev =>
        prev.map(c => targetIssue.linkedComplaintIds.includes(c.id) ? { ...c, status: 'resolved' } : c)
      );
    } else if (conflictResult.finalStatus === 'in_progress') {
      setComplaints(prev =>
        prev.map(c => targetIssue.linkedComplaintIds.includes(c.id) ? { ...c, status: 'in_progress' } : c)
      );
    }

    return {
      isConflict: conflictResult.isConflict,
      message: conflictResult.resolutionNote,
    };
  };

  // Reopen an issue
  const reopenIssue = (issueId: string, actingDept: Department, reason: string) => {
    const targetIssue = issues.find(i => i.id === issueId);
    if (!targetIssue) return;

    const updatedIssue: Issue = {
      ...targetIssue,
      status: 'reopened',
      resolutionEvents: [
        ...targetIssue.resolutionEvents,
        {
          id: `EVT-${Date.now()}`,
          timestamp: new Date().toISOString(),
          eventType: 'reopened',
          actingDepartment: actingDept,
          notes: `Issue reopened: ${reason}`,
          actorName: 'Municipal Operations',
        },
      ],
    };

    setIssues(prev => prev.map(iss => iss.id === issueId ? updatedIssue : iss));
  };

  // Aggregate stats
  const stats = useMemo(() => {
    const totalComplaints = complaints.length;
    const uniqueIssues = issues.length;
    // Consolidated duplicates: total complaints minus unique issues
    const consolidatedDuplicates = Math.max(0, totalComplaints - uniqueIssues);
    const consolidationRate = totalComplaints > 0 ? Number(((consolidatedDuplicates / totalComplaints) * 100).toFixed(1)) : 0;
    const pendingReviewCount = reviewQueue.length;
    const resolvedIssuesCount = issues.filter(i => i.status === 'resolved').length;
    const reopenedIssuesCount = issues.filter(i => i.status === 'reopened').length;
    const inProgressIssuesCount = issues.filter(i => i.status === 'in_progress').length;

    const departmentBreakdown: Record<Department, { complaints: number; leadIssues: number }> = {
      'Public Works': { complaints: 0, leadIssues: 0 },
      'Transportation': { complaints: 0, leadIssues: 0 },
      'Water Resources': { complaints: 0, leadIssues: 0 },
      'Code Compliance': { complaints: 0, leadIssues: 0 },
      'Parks & Sanitation': { complaints: 0, leadIssues: 0 },
      '311 Unified Contact Center': { complaints: 0, leadIssues: 0 },
    };

    for (const c of complaints) {
      if (departmentBreakdown[c.department]) {
        departmentBreakdown[c.department].complaints++;
      }
    }

    for (const i of issues) {
      if (departmentBreakdown[i.leadDepartment]) {
        departmentBreakdown[i.leadDepartment].leadIssues++;
      }
    }

    return {
      totalComplaints,
      uniqueIssues,
      consolidatedDuplicates,
      consolidationRate,
      pendingReviewCount,
      resolvedIssuesCount,
      reopenedIssuesCount,
      inProgressIssuesCount,
      departmentBreakdown,
    };
  }, [complaints, issues, reviewQueue]);

  return (
    <CivicContext.Provider
      value={{
        complaints,
        issues,
        reviewQueue,
        evaluationReport,
        edgeCaseResults,
        activeTab,
        setActiveTab,
        selectedIssueId,
        setSelectedIssueId,
        prototypeThreshold,
        setPrototypeThreshold,
        reviewThreshold,
        setReviewThreshold,
        submitComplaint,
        approveReviewMatch,
        rejectReviewMatch,
        unlinkComplaint,
        updateIssueStatus,
        reopenIssue,
        runBenchmarks,
        runEdgeCases,
        resetToInitialData,
        stats,
      }}
    >
      {children}
    </CivicContext.Provider>
  );
};

export function useCivic() {
  const context = useContext(CivicContext);
  if (!context) {
    throw new Error('useCivic must be used within a CivicProvider');
  }
  return context;
}
