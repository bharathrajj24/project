/**
 * Deduplication Engine: Baseline Deterministic Matcher & Multi-Signal Prototype Matcher
 */

import {
  Category,
  Complaint,
  DeduplicationMatch,
  Department,
  Issue,
  MatchFeatureScores,
} from '../types';
import { calculateHaversineDistanceMeters, computeGeoProximityScore } from './geo';
import { computeTextSimilarity } from './nlp';

// Category Compatibility Matrix (0.0 to 1.0)
const CATEGORY_COMPATIBILITY: Record<Category, Record<Category, number>> = {
  'Roads & Pavement': {
    'Roads & Pavement': 1.0,
    'Stormwater & Drainage': 0.35,
    'Street Lighting & Signals': 0.2,
    'Sanitation & Waste': 0.1,
    'Building & Zoning Permits': 0.15,
  },
  'Stormwater & Drainage': {
    'Roads & Pavement': 0.35,
    'Stormwater & Drainage': 1.0,
    'Street Lighting & Signals': 0.1,
    'Sanitation & Waste': 0.25,
    'Building & Zoning Permits': 0.1,
  },
  'Street Lighting & Signals': {
    'Roads & Pavement': 0.2,
    'Stormwater & Drainage': 0.1,
    'Street Lighting & Signals': 1.0,
    'Sanitation & Waste': 0.05,
    'Building & Zoning Permits': 0.1,
  },
  'Sanitation & Waste': {
    'Roads & Pavement': 0.1,
    'Stormwater & Drainage': 0.25,
    'Street Lighting & Signals': 0.05,
    'Sanitation & Waste': 1.0,
    'Building & Zoning Permits': 0.1,
  },
  'Building & Zoning Permits': {
    'Roads & Pavement': 0.15,
    'Stormwater & Drainage': 0.1,
    'Street Lighting & Signals': 0.1,
    'Sanitation & Waste': 0.1,
    'Building & Zoning Permits': 1.0,
  },
};

/**
 * Returns category compatibility score
 */
export function getCategoryCompatibility(cat1: Category, cat2: Category): number {
  return CATEGORY_COMPATIBILITY[cat1]?.[cat2] ?? 0.1;
}

/**
 * Computes temporal similarity (recency and issue lifecycle overlap)
 */
export function computeTemporalScore(complaintTimestamp: string, issueTimestamp: string): number {
  const t1 = new Date(complaintTimestamp).getTime();
  const t2 = new Date(issueTimestamp).getTime();
  const diffDays = Math.abs(t1 - t2) / (1000 * 60 * 60 * 24);
  
  if (diffDays <= 3) return 1.0;
  if (diffDays <= 14) return 0.9;
  if (diffDays <= 30) return 0.75;
  if (diffDays <= 60) return 0.55;
  return Math.max(0.2, Number((1 / (1 + diffDays / 30)).toFixed(2)));
}

/**
 * Computes synthetic visual similarity
 */
export function computeVisualSimilarity(hashA?: string, hashB?: string): number {
  if (!hashA || !hashB) return 0.5; // neutral fallback
  if (hashA === hashB) return 0.95;
  
  // Hamming distance comparison on feature hex strings
  let matchingBits = 0;
  const len = Math.min(hashA.length, hashB.length);
  for (let i = 0; i < len; i++) {
    if (hashA[i] === hashB[i]) matchingBits++;
  }
  return Number((matchingBits / len).toFixed(2));
}

// Default system matching thresholds
export const THRESHOLD_AUTO_MERGE = 0.75;
export const THRESHOLD_REVIEW_QUEUE = 0.50;

/**
 * Baseline Deterministic Matcher:
 * - Requires exact category match
 * - Requires distance <= 50m (if location missing, rejected)
 * - Requires basic token overlap >= 0.50
 */
export function evaluateBaselineMatch(
  complaint: Complaint,
  target: Issue | Complaint
): { isMatch: boolean; confidence: number; reason: string } {
  // 1. Strict category check
  if (complaint.category !== target.category) {
    return {
      isMatch: false,
      confidence: 0.1,
      reason: `Baseline rejected: Category mismatch ('${complaint.category}' vs '${target.category}')`,
    };
  }

  // 2. Strict location check
  const locA = complaint.location;
  const locB = 'location' in target ? target.location : undefined;
  
  if (!locA || !locB) {
    return {
      isMatch: false,
      confidence: 0.2,
      reason: 'Baseline rejected: Missing coordinates on one or both records',
    };
  }

  const distanceMeters = calculateHaversineDistanceMeters(locA, locB);
  if (distanceMeters > 50) {
    return {
      isMatch: false,
      confidence: 0.3,
      reason: `Baseline rejected: Distance (${distanceMeters}m) exceeds strict 50m threshold`,
    };
  }

  // 3. Simple text overlap
  const targetText = 'description' in target ? target.description : target.title;
  const { score: textScore } = computeTextSimilarity(complaint.description, targetText);
  
  if (textScore < 0.45) {
    return {
      isMatch: false,
      confidence: textScore,
      reason: `Baseline rejected: Text similarity (${(textScore * 100).toFixed(0)}%) below 45% threshold`,
    };
  }

  return {
    isMatch: true,
    confidence: Number(((textScore + (1 - distanceMeters / 50)) / 2).toFixed(2)),
    reason: `Baseline confirmed: Category matched, distance ${distanceMeters}m <= 50m, text similarity ${(textScore * 100).toFixed(0)}%`,
  };
}

/**
 * Prototype Multi-Signal Scoring Engine:
 * Combines Text, Geospatial, Category Compatibility, Temporal, and Synthetic Visual signals.
 * Generates transparent feature scores and plain-language explainability.
 */
export function scoreCandidateMatch(
  complaint: Complaint,
  issue: Issue,
  customThreshold = THRESHOLD_AUTO_MERGE,
  customReviewThreshold = THRESHOLD_REVIEW_QUEUE
): DeduplicationMatch {
  // 1. Text Similarity
  const { score: textScore, sharedTokens } = computeTextSimilarity(
    complaint.description,
    `${issue.title} ${issue.resolutionNotes || ''}`
  );

  // 2. Geospatial Distance & Proximity Score
  let geoDistanceMeters: number | null = null;
  let geoScore = 0.5;
  const isLocationMissing = !complaint.location || !issue.location;

  if (!isLocationMissing && complaint.location && issue.location) {
    geoDistanceMeters = calculateHaversineDistanceMeters(complaint.location, issue.location);
    geoScore = computeGeoProximityScore(geoDistanceMeters);
  }

  // 3. Category Compatibility
  const catScore = getCategoryCompatibility(complaint.category, issue.category);

  // 4. Temporal Decay
  const temporalScore = computeTemporalScore(complaint.timestamp, issue.lastReportedAt);

  // 5. Visual Similarity
  const visualScore = computeVisualSimilarity(
    complaint.imageFeatureHash,
    `hash_${issue.category.substring(0, 4)}`
  );

  // Weights allocation: if location is missing, redistribute geo weight gracefully to text and category
  let wText = 0.40;
  let wGeo = 0.35;
  let wCat = 0.15;
  let wTime = 0.05;
  let wVis = 0.05;

  if (isLocationMissing) {
    wText = 0.60;
    wGeo = 0.00;
    wCat = 0.25;
    wTime = 0.10;
    wVis = 0.05;
  }

  // Composite Score
  const overallScore = Number(
    (
      textScore * wText +
      geoScore * wGeo +
      catScore * wCat +
      temporalScore * wTime +
      visualScore * wVis
    ).toFixed(3)
  );

  // Match Tier Classification
  let matchTier: 'auto_merge' | 'review_needed' | 'distinct';
  if (overallScore >= customThreshold) {
    matchTier = 'auto_merge';
  } else if (overallScore >= customReviewThreshold) {
    matchTier = 'review_needed';
  } else {
    matchTier = 'distinct';
  }

  // Generate plain-language explainability breakdown
  const explainability: string[] = [];

  if (isLocationMissing) {
    explainability.push('Geographic fallback: Coordinates unavailable on report; weight safely shifted to text & municipal category compatibility.');
  } else if (geoDistanceMeters !== null) {
    if (geoDistanceMeters <= 30) {
      explainability.push(`High spatial proximity: Located within ${geoDistanceMeters}m of issue centroid (Geo score: ${(geoScore * 100).toFixed(0)}%).`);
    } else if (geoDistanceMeters <= 120) {
      explainability.push(`Moderate proximity: Located ${geoDistanceMeters}m away along the same corridor (Geo score: ${(geoScore * 100).toFixed(0)}%).`);
    } else {
      explainability.push(`Spatial distance: ${geoDistanceMeters}m apart; proximity decay applied (Geo score: ${(geoScore * 100).toFixed(0)}%).`);
    }
  }

  if (textScore >= 0.70) {
    explainability.push(`Strong textual alignment (${(textScore * 100).toFixed(0)}% match). Shared key terms: ${sharedTokens.slice(0, 4).join(', ') || 'semantic terms'}.`);
  } else if (textScore >= 0.40) {
    explainability.push(`Partial semantic match (${(textScore * 100).toFixed(0)}%). Corroborating municipal keywords: ${sharedTokens.join(', ') || 'context cues'}.`);
  } else {
    explainability.push(`Low text similarity (${(textScore * 100).toFixed(0)}%). Different vocabulary or descriptive focus.`);
  }

  if (catScore === 1.0) {
    explainability.push(`Direct category congruence: Both classified under '${complaint.category}'.`);
  } else if (catScore >= 0.3) {
    explainability.push(`Cross-department operational overlap: '${complaint.category}' is compatible with issue's '${issue.category}'.`);
  } else {
    explainability.push(`Divergent municipal classifications ('${complaint.category}' vs '${issue.category}').`);
  }

  const featureScores: MatchFeatureScores = {
    textSimilarity: textScore,
    geoDistanceMeters,
    geoScore: isLocationMissing ? 0.5 : geoScore,
    categoryCompatibility: catScore,
    visualSimilarity: visualScore,
    temporalScore,
  };

  return {
    id: `MAT-${complaint.id}-${issue.id}`,
    complaintId: complaint.id,
    candidateIssueId: issue.id,
    overallScore,
    featureScores,
    matchTier,
    explainability,
    matchedAt: new Date().toISOString(),
    status: 'pending',
  };
}

/**
 * Finds the top candidate issue for an incoming complaint
 */
export function findBestCandidateIssue(
  complaint: Complaint,
  existingIssues: Issue[],
  customThreshold = THRESHOLD_AUTO_MERGE,
  customReviewThreshold = THRESHOLD_REVIEW_QUEUE
): DeduplicationMatch | null {
  if (existingIssues.length === 0) return null;

  let bestMatch: DeduplicationMatch | null = null;
  let highestScore = -1;

  for (const issue of existingIssues) {
    const candidate = scoreCandidateMatch(complaint, issue, customThreshold, customReviewThreshold);
    if (candidate.overallScore > highestScore) {
      highestScore = candidate.overallScore;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

/**
 * Explicit Lifecycle Policy for Resolved Issues Receiving New Complaints:
 * If an issue is 'resolved', determine whether the new report should:
 * - 'reopen': If received within 30 days and confidence score >= 0.70 (indicating recurrence/re-emergence)
 * - 'new_issue': If received > 30 days later or confidence is lower (treated as a new distinct incident)
 */
export function evaluateResolvedIssuePolicy(
  issue: Issue,
  newComplaint: Complaint,
  score: number
): { action: 'reopen' | 'new_issue'; reasoning: string } {
  const lastEvent = issue.resolutionEvents[issue.resolutionEvents.length - 1];
  const resolutionTime = lastEvent ? new Date(lastEvent.timestamp).getTime() : new Date(issue.lastReportedAt).getTime();
  const complaintTime = new Date(newComplaint.timestamp).getTime();
  const daysSinceResolution = Math.max(0, (complaintTime - resolutionTime) / (1000 * 60 * 60 * 24));

  if (daysSinceResolution <= 30 && score >= 0.70) {
    return {
      action: 'reopen',
      reasoning: `Complaint received ${daysSinceResolution.toFixed(1)} days post-resolution with ${(score * 100).toFixed(0)}% similarity. Meets recurrence criteria; issue will be REOPENED.`,
    };
  }

  return {
    action: 'new_issue',
    reasoning: `Complaint received ${daysSinceResolution.toFixed(1)} days post-resolution (or score ${(score * 100).toFixed(0)}% < 70%). Meets distinct incident criteria; a new issue record will be spawned.`,
  };
}

/**
 * Explicit Conflict Resolution Policy for Contradictory Department Updates:
 * When two departments submit divergent statuses (e.g. Public Works vs Water Resources):
 * - Lead Department has binding operational authority for current primary status.
 * - Conflicting update is recorded in the immutable audit trail as a 'conflict_flagged' event.
 */
export function resolveDepartmentStatusConflict(
  issue: Issue,
  actingDepartment: Department,
  proposedStatus: Issue['status'],
  notes: string
): {
  finalStatus: Issue['status'];
  isConflict: boolean;
  resolutionNote: string;
} {
  const isLead = actingDepartment === issue.leadDepartment;

  if (isLead) {
    return {
      finalStatus: proposedStatus,
      isConflict: false,
      resolutionNote: `Status updated to '${proposedStatus}' by Lead Department (${actingDepartment}).`,
    };
  }

  // Non-lead department submits an update that contradicts current lead status
  if (proposedStatus !== issue.status) {
    return {
      finalStatus: issue.status, // Preserve lead department status
      isConflict: true,
      resolutionNote: `CONTRADICTORY STATUS FLAGGED: Secondary department '${actingDepartment}' proposed '${proposedStatus}', but Lead Department '${issue.leadDepartment}' maintains '${issue.status}'. Audit trail updated. Lead operational override applies.`,
    };
  }

  return {
    finalStatus: proposedStatus,
    isConflict: false,
    resolutionNote: `Status confirmed as '${proposedStatus}' by '${actingDepartment}'.`,
  };
}
