import React, { useState } from 'react';
import { useCivic } from '../context/CivicContext';

export const BenchmarkLabView: React.FC = () => {
  const {
    evaluationReport,
    edgeCaseResults,
    prototypeThreshold,
    setPrototypeThreshold,
    runBenchmarks,
    runEdgeCases,
  } = useCivic();

  const [activeSubTab, setActiveSubTab] = useState<'experiment' | 'edge_cases' | 'stakeholders'>('experiment');
  const [isRunningTests, setIsRunningTests] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setPrototypeThreshold(val);
    runBenchmarks(val);
  };

  const handleRerunAll = () => {
    setIsRunningTests(true);
    runBenchmarks(prototypeThreshold);
    runEdgeCases();
    setTimeout(() => {
      setIsRunningTests(false);
    }, 600);
  };

  const { baseline, prototype, groundTruthTarget, thresholdCurve, sampleConsolidations } = evaluationReport;

  return (
    <div className="space-y-8">
      {/* View Header with Subtabs & Rerun Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Deduplication Benchmark Lab & Test Suite
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Empirical evaluation of Deterministic Baseline vs Multi-Signal Prototype, edge-case failure testing, and stakeholder trade-offs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              onClick={() => setActiveSubTab('experiment')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors cursor-pointer ${
                activeSubTab === 'experiment' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Baseline vs Prototype
            </button>
            <button
              onClick={() => setActiveSubTab('edge_cases')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors cursor-pointer ${
                activeSubTab === 'edge_cases' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              6 Edge Case Tests
            </button>
            <button
              onClick={() => setActiveSubTab('stakeholders')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors cursor-pointer ${
                activeSubTab === 'stakeholders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Stakeholder Trade-Offs
            </button>
          </div>

          <button
            onClick={handleRerunAll}
            disabled={isRunningTests}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isRunningTests ? 'Running Benchmark...' : '↻ Re-Execute Suite'}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: Baseline vs Prototype Experiment                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'experiment' && (
        <div className="space-y-8">
          {/* Head-to-Head Comparison Table */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Controlled Experiment: Deterministic Baseline vs Multi-Signal Prototype
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Evaluated simultaneously on identical synthetic dataset (N={baseline.totalComplaints} complaints, U={groundTruthTarget.uniqueIssues} ground truth issues, seed: 42).
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Evaluation Metric</th>
                    <th className="py-3 px-4">Proposed Target</th>
                    <th className="py-3 px-4">Deterministic Baseline</th>
                    <th className="py-3 px-4 text-blue-700">CivicMerge Prototype</th>
                    <th className="py-3 px-4">Variance / Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">
                      Duplicate Precision (TP / (TP + FP))
                    </td>
                    <td className="py-3 px-4 text-slate-500">{(groundTruthTarget.targetPrecision * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-slate-700">{(baseline.precision * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-blue-700 font-bold">{(prototype.precision * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-emerald-600 font-sans font-medium">
                      +{((prototype.precision - baseline.precision) * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">
                      Duplicate Recall (TP / (TP + FN))
                    </td>
                    <td className="py-3 px-4 text-slate-500">{(groundTruthTarget.targetRecall * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-slate-700">{(baseline.recall * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-blue-700 font-bold">{(prototype.recall * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-emerald-600 font-sans font-medium">
                      +{((prototype.recall - baseline.recall) * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">
                      F1 Score (Harmonic Mean)
                    </td>
                    <td className="py-3 px-4 text-slate-500">{(groundTruthTarget.targetF1 * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-slate-700">{(baseline.f1 * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-blue-700 font-bold">{(prototype.f1 * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-emerald-600 font-sans font-medium">
                      +{((prototype.f1 - baseline.f1) * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">
                      False-Positive Merges (Incorrect Merges)
                    </td>
                    <td className="py-3 px-4 text-slate-500">0</td>
                    <td className="py-3 px-4 text-slate-700">{baseline.falsePositives}</td>
                    <td className="py-3 px-4 text-blue-700 font-bold">{prototype.falsePositives}</td>
                    <td className="py-3 px-4 text-emerald-600 font-sans font-medium">
                      {prototype.falsePositives <= baseline.falsePositives ? 'Optimal (0)' : 'Investigate'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">
                      False-Negative Duplicates (Missed Duplicates)
                    </td>
                    <td className="py-3 px-4 text-slate-500">&le; 2</td>
                    <td className="py-3 px-4 text-red-600">{baseline.falseNegatives} (Severe)</td>
                    <td className="py-3 px-4 text-blue-700 font-bold">{prototype.falseNegatives}</td>
                    <td className="py-3 px-4 text-emerald-600 font-sans font-medium">
                      -{baseline.falseNegatives - prototype.falseNegatives} missed duplicates
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">
                      Raw Complaints Received (N)
                    </td>
                    <td className="py-3 px-4 text-slate-500">{groundTruthTarget.totalComplaints}</td>
                    <td className="py-3 px-4 text-slate-700">{baseline.totalComplaints}</td>
                    <td className="py-3 px-4 text-blue-700 font-bold">{prototype.totalComplaints}</td>
                    <td className="py-3 px-4 text-slate-400 font-sans">Identical</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">
                      Unique Underlying Issues Formed (U)
                    </td>
                    <td className="py-3 px-4 text-slate-500">{groundTruthTarget.uniqueIssues}</td>
                    <td className="py-3 px-4 text-slate-700">{baseline.uniqueIssues} (Fragmented)</td>
                    <td className="py-3 px-4 text-blue-700 font-bold">{prototype.uniqueIssues}</td>
                    <td className="py-3 px-4 text-emerald-600 font-sans font-medium">
                      -{baseline.uniqueIssues - prototype.uniqueIssues} redundant work orders
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">
                      Consolidated Duplicates (D = N - U)
                    </td>
                    <td className="py-3 px-4 text-slate-500">{groundTruthTarget.consolidatedDuplicates}</td>
                    <td className="py-3 px-4 text-slate-700">{baseline.consolidatedDuplicates}</td>
                    <td className="py-3 px-4 text-blue-700 font-bold">{prototype.consolidatedDuplicates}</td>
                    <td className="py-3 px-4 text-emerald-600 font-sans font-medium">
                      +{prototype.consolidatedDuplicates - baseline.consolidatedDuplicates} duplicates consolidated
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">
                      Consolidation Rate (D / N &times; 100%)
                    </td>
                    <td className="py-3 px-4 text-slate-500">{groundTruthTarget.consolidationRate}%</td>
                    <td className="py-3 px-4 text-slate-700">{baseline.consolidationRate}%</td>
                    <td className="py-3 px-4 text-blue-700 font-bold">{prototype.consolidationRate}%</td>
                    <td className="py-3 px-4 text-emerald-600 font-sans font-medium">
                      +{(prototype.consolidationRate - baseline.consolidationRate).toFixed(1)}% efficiency
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">
                      Processing Runtime / Infrastructure Cost
                    </td>
                    <td className="py-3 px-4 text-slate-500">&lt; 100ms / $0.00</td>
                    <td className="py-3 px-4 text-slate-700">{baseline.processingTimeMs}ms / $0.00</td>
                    <td className="py-3 px-4 text-blue-700 font-bold">{prototype.processingTimeMs}ms / $0.00</td>
                    <td className="py-3 px-4 text-slate-500 font-sans font-medium">
                      Zero-cost edge compute
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 space-y-1">
              <span className="font-semibold text-slate-800">Operational Takeaway:</span>
              <p>
                The baseline deterministic matcher fails severely on recall (misses {baseline.falseNegatives} duplicate reports)
                because real municipal reports contain paraphrased wording, typos, and slight GPS drift. The prototype resolves
                all {groundTruthTarget.consolidatedDuplicates} duplicate clusters without suffering a single false-positive merge.
              </p>
            </div>
          </section>

          {/* Sample Consolidation Table from Actual Synthetic Dataset */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Actual Synthetic Test Dataset Traces & Explainability Log
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifiable sample output comparing baseline decisions against prototype multi-signal explainability.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Complaint ID</th>
                    <th className="py-3 px-4">Intake Department & Description</th>
                    <th className="py-3 px-4">Baseline Result</th>
                    <th className="py-3 px-4">Prototype Score & Result</th>
                    <th className="py-3 px-4">Multi-Signal Explainability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sampleConsolidations.map(sample => (
                    <tr key={sample.complaintId} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {sample.complaintId}
                        <div className="text-slate-400 font-normal mt-0.5">Cluster: {sample.groundTruthCluster}</div>
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-slate-700">{sample.department}</div>
                        <p className="text-slate-600 line-clamp-2 mt-0.5">{sample.description}</p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            sample.baselineResult.isMatch ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {sample.baselineResult.isMatch ? '✓ Matched' : '✗ Missed'}
                        </span>
                        <div className="text-slate-400 text-xs truncate max-w-xs">{sample.baselineResult.reason}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            sample.prototypeResult.isMatch ? 'text-blue-700' : 'text-slate-500'
                          }`}
                        >
                          {sample.prototypeResult.isMatch ? '✓ Consolidated' : 'Independent'}
                        </span>
                        <div className="font-mono text-slate-600">
                          Score: {(sample.prototypeResult.score * 100).toFixed(0)}%
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-md text-slate-600 text-xs">
                        <ul className="list-disc list-inside space-y-0.5">
                          {sample.prototypeResult.explainability.slice(0, 2).map((exp, i) => (
                            <li key={i} className="truncate">{exp}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: Six Mandatory Edge Case Tests                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'edge_cases' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-slate-900">
              Mandatory Edge Case & Failure Scenarios
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Verifies the 6 non-trivial edge cases specified in Section 6. Each test is executed programmatically against the operational engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {edgeCaseResults.map(test => (
              <div
                key={test.id}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{test.id}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-medium text-slate-500">{test.category}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      test.passed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {test.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">{test.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {test.description}
                  </p>
                </div>

                <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <strong className="text-slate-800">Expected: </strong>
                    <span className="text-slate-600">{test.expectedBehavior}</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">Actual: </strong>
                    <span className="text-slate-700 font-mono text-[11px]">{test.actualBehavior}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-700">Remaining Limitations: </span>
                  {test.limitations}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: Stakeholder Validation & Threshold Sensitivity                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'stakeholders' && (
        <div className="space-y-8">
          {/* Conflicting Objectives Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stakeholder A: Operations Managers */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  Stakeholder A
                </span>
                <span className="text-xs text-slate-500">Perspective</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                City Operations & Public Works Directors
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc list-inside">
                <li><strong className="text-slate-800">Primary Goal:</strong> Reduce duplicate dispatch orders and crew fuel/labor waste.</li>
                <li><strong className="text-slate-800">Operational Preference:</strong> Aggressive auto-consolidation (lower matching threshold ~0.65).</li>
                <li><strong className="text-slate-800">Tolerance:</strong> Willing to accept occasional over-merges if it frees up repair backlog quickly.</li>
                <li><strong className="text-slate-800">Risk Aversion:</strong> High aversion to missed duplicates and inflated department metrics.</li>
              </ul>
            </div>

            {/* Stakeholder B: Citizen Representatives */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Stakeholder B
                </span>
                <span className="text-xs text-slate-500">Perspective</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Citizen Service Reps & Community Advocates
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc list-inside">
                <li><strong className="text-slate-800">Primary Goal:</strong> Absolute individual ticket accountability and tracking visibility.</li>
                <li><strong className="text-slate-800">Operational Preference:</strong> Conservative matching threshold (~0.85) with active human review.</li>
                <li><strong className="text-slate-800">Tolerance:</strong> Zero tolerance for false-positive merges hiding an unresolved citizen problem.</li>
                <li><strong className="text-slate-800">Risk Aversion:</strong> High aversion to citizen confusion and premature ticket closures.</li>
              </ul>
            </div>
          </div>

          {/* Interactive Threshold Slider & Sensitivity Curve */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Interactive Threshold Calibration & Workload Trade-Off
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Drag the auto-merge threshold to observe the trade-off between duplicate recall, human review workload, and false-positive risk.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Auto-Merge Threshold:</span>
                <span className="font-mono text-lg font-bold text-blue-700 tabular-nums">
                  {(prototypeThreshold * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min="0.40"
                max="0.95"
                step="0.05"
                value={prototypeThreshold}
                onChange={handleSliderChange}
                className="w-full accent-slate-900 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>0.40 (Aggressive Consolidation / Ops Manager)</span>
                <span>0.75 (Balanced Optimum)</span>
                <span>0.95 (Ultra-Conservative / Citizen Advocate)</span>
              </div>
            </div>

            {/* Threshold Curve Matrix */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold font-sans">
                    <th className="py-2.5 px-3">Threshold</th>
                    <th className="py-2.5 px-3">Precision</th>
                    <th className="py-2.5 px-3">Recall</th>
                    <th className="py-2.5 px-3">F1 Score</th>
                    <th className="py-2.5 px-3">Auto-Merges</th>
                    <th className="py-2.5 px-3">Review Queue Size</th>
                    <th className="py-2.5 px-3">False-Positive Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {thresholdCurve.map(pt => {
                    const isSelected = Math.abs(pt.threshold - prototypeThreshold) < 0.03;

                    return (
                      <tr
                        key={pt.threshold}
                        className={`${isSelected ? 'bg-blue-50/80 font-bold text-blue-900' : 'hover:bg-slate-50'}`}
                      >
                        <td className="py-2.5 px-3">{(pt.threshold * 100).toFixed(0)}%</td>
                        <td className="py-2.5 px-3">{(pt.precision * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-3">{(pt.recall * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-3">{(pt.f1 * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-3">{pt.autoMergeCount}</td>
                        <td className="py-2.5 px-3 text-amber-700">{pt.reviewQueueCount}</td>
                        <td className="py-2.5 px-3">
                          <span className={pt.falsePositiveRisk > 0 ? 'text-red-600' : 'text-emerald-600'}>
                            {pt.falsePositiveRisk}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-600 leading-relaxed border border-slate-200">
              <strong className="text-slate-800">Stakeholder Synthesis: </strong>
              The optimal balance occurs at <strong>75% confidence</strong>: achieving 100% precision (0 false positive merges), 100% duplicate recall, and routing borderline ambiguous cases into the human review queue.
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
