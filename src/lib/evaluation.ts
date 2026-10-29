/**
 * Benchmark Evaluation Suite for Municipal Complaint Deduplication
 * Evaluates both Baseline (Deterministic) and Prototype (Multi-Signal Explainable) approaches
 * on the exact same labelled ground truth dataset.
 */

import { generateSyntheticDataset } from '../data/syntheticDataset';
import { Complaint, EvaluationMetrics, Issue, ThresholdAnalysisPoint } from '../types';
import { evaluateBaselineMatch, scoreCandidateMatch } from './deduplication';

export interface EvaluationReport {
  baseline: EvaluationMetrics;
  prototype: EvaluationMetrics;
  thresholdCurve: ThresholdAnalysisPoint[];
  groundTruthTarget: {
    totalComplaints: number;
    uniqueIssues: number;
    consolidatedDuplicates: number;
    consolidationRate: number;
    targetPrecision: number;
    targetRecall: number;
    targetF1: number;
  };
  sampleConsolidations: Array<{
    complaintId: string;
    description: string;
    department: string;
    groundTruthCluster: string;
    baselineResult: { isMatch: boolean; reason: string };
    prototypeResult: { isMatch: boolean; score: number; explainability: string[] };
    isTrueDuplicate: boolean;
  }>;
}

/**
 * Runs a rigorous cluster consolidation simulation on the test complaints
 */
export function runBenchmarkEvaluation(customPrototypeThreshold = 0.75): EvaluationReport {
  const dataset = generateSyntheticDataset(42);
  const complaints = [...dataset.complaints].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const totalN = complaints.length; // 28
  const expectedUniqueU = dataset.metadata.expectedUniqueIssues; // 15
  const expectedD = dataset.metadata.expectedDuplicates; // 13
  const expectedRate = dataset.metadata.expectedConsolidationRate; // 46.4%

  // -------------------------------------------------------------
  // 1. Evaluate Baseline (Deterministic)
  // -------------------------------------------------------------
  const baselineStartTime = performance.now();
  let bTP = 0;
  let bFP = 0;
  let bFN = 0;
  let bTN = 0;

  // Active baseline clusters: map clusterId -> anchor complaint
  const baselineClusters: Array<{ clusterId: string; complaints: Complaint[] }> = [];

  for (const comp of complaints) {
    let matchedCluster: { clusterId: string; complaints: Complaint[] } | null = null;

    for (const cluster of baselineClusters) {
      // Compare against anchor complaint of cluster
      const anchor = cluster.complaints[0];
      const result = evaluateBaselineMatch(comp, anchor);
      if (result.isMatch) {
        matchedCluster = cluster;
        break;
      }
    }

    // Check against ground truth
    const isActuallyDuplicate = complaints
      .slice(0, complaints.indexOf(comp))
      .some(prev => prev.groundTruthIssueId === comp.groundTruthIssueId);

    if (matchedCluster) {
      // System called it duplicate
      const anchor = matchedCluster.complaints[0];
      if (anchor.groundTruthIssueId === comp.groundTruthIssueId) {
        bTP++; // Correct duplicate match
      } else {
        bFP++; // Incorrect merge of unrelated complaint
      }
      matchedCluster.complaints.push(comp);
    } else {
      // System called it distinct / new issue
      if (isActuallyDuplicate) {
        bFN++; // Missed duplicate
      } else {
        bTN++; // Correctly identified distinct issue
      }
      baselineClusters.push({
        clusterId: `BASE-ISS-${baselineClusters.length + 1}`,
        complaints: [comp],
      });
    }
  }

  const baselineEndTime = performance.now();
  const bPrecision = bTP + bFP > 0 ? Number((bTP / (bTP + bFP)).toFixed(3)) : 0;
  const bRecall = bTP + bFN > 0 ? Number((bTP / (bTP + bFN)).toFixed(3)) : 0;
  const bF1 = bPrecision + bRecall > 0 ? Number(((2 * bPrecision * bRecall) / (bPrecision + bRecall)).toFixed(3)) : 0;
  const bConsolidated = totalN - baselineClusters.length;
  const bRate = Number(((bConsolidated / totalN) * 100).toFixed(1));

  // -------------------------------------------------------------
  // 2. Evaluate Prototype (Multi-Signal Scoring)
  // -------------------------------------------------------------
  const protoStartTime = performance.now();
  let pTP = 0;
  let pFP = 0;
  let pFN = 0;
  let pTN = 0;

  // Simulated live issues for prototype
  const protoIssues: Issue[] = [];

  for (const comp of complaints) {
    let bestCandidate: { issue: Issue; score: number } | null = null;

    for (const iss of protoIssues) {
      const match = scoreCandidateMatch(comp, iss, customPrototypeThreshold, 0.50);
      if (match.matchTier === 'auto_merge') {
        if (!bestCandidate || match.overallScore > bestCandidate.score) {
          bestCandidate = { issue: iss, score: match.overallScore };
        }
      }
    }

    const isActuallyDuplicate = complaints
      .slice(0, complaints.indexOf(comp))
      .some(prev => prev.groundTruthIssueId === comp.groundTruthIssueId);

    if (bestCandidate) {
      // System linked to bestCandidate
      // Check if candidate has a complaint with the same ground truth ID
      const hasMatchingGroundTruth = bestCandidate.issue.linkedComplaintIds.some(linkedId => {
        const found = complaints.find(c => c.id === linkedId);
        return found && found.groundTruthIssueId === comp.groundTruthIssueId;
      });

      if (hasMatchingGroundTruth) {
        pTP++;
      } else {
        pFP++;
      }
      bestCandidate.issue.linkedComplaintIds.push(comp.id);
    } else {
      if (isActuallyDuplicate) {
        pFN++;
      } else {
        pTN++;
      }
      // Create new issue record
      protoIssues.push({
        id: `PROTO-ISS-${protoIssues.length + 1}`,
        title: comp.description.substring(0, 60),
        category: comp.category,
        leadDepartment: comp.department,
        priority: 'medium',
        status: 'reported',
        location: comp.location || { lat: 37.7749, lng: -122.4194, address: 'Reported Location' },
        linkedComplaintIds: [comp.id],
        departmentCounts: { [comp.department]: 1 } as any,
        firstReportedAt: comp.timestamp,
        lastReportedAt: comp.timestamp,
        resolutionEvents: [],
      });
    }
  }

  const protoEndTime = performance.now();
  const pPrecision = pTP + pFP > 0 ? Number((pTP / (pTP + pFP)).toFixed(3)) : 0;
  const pRecall = pTP + pFN > 0 ? Number((pTP / (pTP + pFN)).toFixed(3)) : 0;
  const pF1 = pPrecision + pRecall > 0 ? Number(((2 * pPrecision * pRecall) / (pPrecision + pRecall)).toFixed(3)) : 0;
  const pConsolidated = totalN - protoIssues.length;
  const pRate = Number(((pConsolidated / totalN) * 100).toFixed(1));

  // -------------------------------------------------------------
  // 3. Generate Sensitivity Curve across Threshold Range (0.35 - 0.90)
  // -------------------------------------------------------------
  const thresholdCurve: ThresholdAnalysisPoint[] = [];
  const testThresholds = [0.40, 0.50, 0.60, 0.68, 0.75, 0.82, 0.88, 0.92];

  for (const th of testThresholds) {
    let curTP = 0;
    let curFP = 0;
    let curFN = 0;
    let curMerges = 0;
    let curReviewQueue = 0;

    // Fast simulation over all pairs
    for (let i = 0; i < complaints.length; i++) {
      const cA = complaints[i];
      let maxScore = 0;
      let targetGroundTruth = '';

      for (let j = 0; j < i; j++) {
        const cB = complaints[j];
        // Create mock target issue from cB
        const mockIssue: Issue = {
          id: `MOCK-${cB.id}`,
          title: cB.description,
          category: cB.category,
          leadDepartment: cB.department,
          priority: 'medium',
          status: 'reported',
          location: cB.location || { lat: 37.7749, lng: -122.4194, address: '' },
          linkedComplaintIds: [cB.id],
          departmentCounts: {} as any,
          firstReportedAt: cB.timestamp,
          lastReportedAt: cB.timestamp,
          resolutionEvents: [],
        };
        const match = scoreCandidateMatch(cA, mockIssue, th, 0.50);
        if (match.overallScore > maxScore) {
          maxScore = match.overallScore;
          targetGroundTruth = cB.groundTruthIssueId || '';
        }
      }

      const isActuallyDup = complaints.slice(0, i).some(c => c.groundTruthIssueId === cA.groundTruthIssueId);

      if (maxScore >= th) {
        curMerges++;
        if (targetGroundTruth === cA.groundTruthIssueId) {
          curTP++;
        } else {
          curFP++;
        }
      } else if (maxScore >= 0.50) {
        curReviewQueue++;
        if (isActuallyDup) curFN++;
      } else {
        if (isActuallyDup) curFN++;
      }
    }

    const prec = curTP + curFP > 0 ? Number((curTP / (curTP + curFP)).toFixed(3)) : 1.0;
    const rec = curTP + curFN > 0 ? Number((curTP / (curTP + curFN)).toFixed(3)) : 0.0;
    const f1Score = prec + rec > 0 ? Number(((2 * prec * rec) / (prec + rec)).toFixed(3)) : 0.0;

    thresholdCurve.push({
      threshold: th,
      precision: prec,
      recall: rec,
      f1: f1Score,
      autoMergeCount: curMerges,
      reviewQueueCount: curReviewQueue,
      falsePositiveRisk: curFP,
    });
  }

  // -------------------------------------------------------------
  // 4. Sample Consolidation Table for Inspection
  // -------------------------------------------------------------
  const sampleConsolidations = complaints.slice(0, 8).map(comp => {
    // Check against initial cluster anchor
    const anchor = dataset.complaints.find(c => c.groundTruthIssueId === comp.groundTruthIssueId && c.id !== comp.id);
    const isTrueDuplicate = Boolean(anchor && new Date(anchor.timestamp) < new Date(comp.timestamp));

    const mockAnchorIssue: Issue = {
      id: `ISS-${anchor?.id || 'ANCHOR'}`,
      title: anchor?.description || comp.description,
      category: anchor?.category || comp.category,
      leadDepartment: anchor?.department || comp.department,
      priority: 'high',
      status: 'in_progress',
      location: anchor?.location || comp.location || { lat: 37.7749, lng: -122.4194, address: '' },
      linkedComplaintIds: anchor ? [anchor.id] : [comp.id],
      departmentCounts: {} as any,
      firstReportedAt: anchor?.timestamp || comp.timestamp,
      lastReportedAt: comp.timestamp,
      resolutionEvents: [],
    };

    const bResult = anchor ? evaluateBaselineMatch(comp, anchor) : { isMatch: false, reason: 'First report in cluster' };
    const pMatch = anchor ? scoreCandidateMatch(comp, mockAnchorIssue, customPrototypeThreshold, 0.50) : null;

    return {
      complaintId: comp.id,
      description: comp.description,
      department: comp.department,
      groundTruthCluster: comp.groundTruthIssueId || 'SINGLE',
      isTrueDuplicate,
      baselineResult: {
        isMatch: bResult.isMatch,
        reason: bResult.reason,
      },
      prototypeResult: {
        isMatch: pMatch ? pMatch.matchTier === 'auto_merge' : false,
        score: pMatch ? pMatch.overallScore : 0,
        explainability: pMatch ? pMatch.explainability : ['Anchor complaint for this municipal issue'],
      },
    };
  });

  return {
    baseline: {
      name: 'Deterministic Baseline (Exact Text + 50m Hard Radius)',
      precision: bPrecision,
      recall: bRecall,
      f1: bF1,
      truePositives: bTP,
      falsePositives: bFP,
      falseNegatives: bFN,
      trueNegatives: bTN,
      totalComplaints: totalN,
      uniqueIssues: baselineClusters.length,
      consolidatedDuplicates: bConsolidated,
      consolidationRate: bRate,
      processingTimeMs: Number((baselineEndTime - baselineStartTime).toFixed(2)),
      estimatedCostUsd: 0.00,
    },
    prototype: {
      name: 'CivicMerge Explainable Multi-Signal Prototype',
      precision: pPrecision,
      recall: pRecall,
      f1: pF1,
      truePositives: pTP,
      falsePositives: pFP,
      falseNegatives: pFN,
      trueNegatives: pTN,
      totalComplaints: totalN,
      uniqueIssues: protoIssues.length,
      consolidatedDuplicates: pConsolidated,
      consolidationRate: pRate,
      processingTimeMs: Number((protoEndTime - protoStartTime).toFixed(2)),
      estimatedCostUsd: 0.00,
    },
    thresholdCurve,
    groundTruthTarget: {
      totalComplaints: totalN,
      uniqueIssues: expectedUniqueU,
      consolidatedDuplicates: expectedD,
      consolidationRate: expectedRate,
      targetPrecision: 0.90,
      targetRecall: 0.85,
      targetF1: 0.87,
    },
    sampleConsolidations,
  };
}
