/**
 * Domain types for CivicMerge Municipal Complaint Deduplication
 */

export type Category = 
  | 'Roads & Pavement'
  | 'Stormwater & Drainage'
  | 'Street Lighting & Signals'
  | 'Sanitation & Waste'
  | 'Building & Zoning Permits';

export type Department = 
  | 'Public Works'
  | 'Transportation'
  | 'Water Resources'
  | 'Code Compliance'
  | 'Parks & Sanitation'
  | '311 Unified Contact Center';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type IssueStatus = 
  | 'reported'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'reopened';

export type ComplaintStatus = 
  | 'received'
  | 'under_triage'
  | 'linked'
  | 'in_progress'
  | 'resolved';

export interface LocationCoords {
  lat: number;
  lng: number;
  address: string;
  ward?: string;
}

export interface Complaint {
  id: string; // e.g. "CMP-2026-0101"
  citizenRef: string; // Anonymised citizen ref, e.g. "CIT-8491"
  description: string;
  category: Category;
  location?: LocationCoords; // Optional for missing location edge case
  timestamp: string; // ISO string
  department: Department;
  status: ComplaintStatus;
  syntheticImageUrl?: string;
  imageFeatureHash?: string;
  linkedIssueId?: string; // Linked underlying issue ID
  groundTruthIssueId?: string; // Strictly for benchmark evaluation, hidden from matcher!
  notes?: string;
}

export interface ResolutionEvent {
  id: string;
  timestamp: string;
  eventType: 'reported' | 'triaged' | 'assigned' | 'in_progress' | 'resolved' | 'reopened' | 'note' | 'conflict_flagged';
  actingDepartment: Department;
  notes: string;
  actorName: string;
}

export interface Issue {
  id: string; // e.g. "ISS-2026-042"
  title: string;
  category: Category;
  leadDepartment: Department;
  priority: Priority;
  status: IssueStatus;
  location: LocationCoords;
  linkedComplaintIds: string[];
  departmentCounts: Record<Department, number>;
  firstReportedAt: string;
  lastReportedAt: string;
  resolutionNotes?: string;
  resolutionEvents: ResolutionEvent[];
}

export interface MatchFeatureScores {
  textSimilarity: number;       // 0.0 - 1.0 (Token Jaccard & TF-IDF Cosine)
  geoDistanceMeters: number | null; // Distance in meters, or null if missing location
  geoScore: number;             // 0.0 - 1.0 (Smooth distance decay)
  categoryCompatibility: number; // 0.0 - 1.0 (Compatibility matrix)
  visualSimilarity: number;     // 0.0 - 1.0 (Image feature hash match)
  temporalScore: number;        // 0.0 - 1.0 (Recency / temporal coherence)
}

export interface DeduplicationMatch {
  id: string;
  complaintId: string;
  candidateIssueId: string;
  overallScore: number; // 0.0 - 1.0
  featureScores: MatchFeatureScores;
  matchTier: 'auto_merge' | 'review_needed' | 'distinct';
  explainability: string[];
  matchedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  decisionNote?: string;
}

export interface EvaluationMetrics {
  name: string;
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  totalComplaints: number;
  uniqueIssues: number;
  consolidatedDuplicates: number;
  consolidationRate: number; // (N - U) / N * 100
  processingTimeMs: number;
  estimatedCostUsd: number;
}

export interface ThresholdAnalysisPoint {
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
  autoMergeCount: number;
  reviewQueueCount: number;
  falsePositiveRisk: number;
}

export interface EdgeCaseResult {
  id: string;
  title: string;
  category: string;
  description: string;
  expectedBehavior: string;
  actualBehavior: string;
  passed: boolean;
  metricsOrEvidence: string;
  limitations: string;
}
