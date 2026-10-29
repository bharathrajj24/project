import React, { useState } from 'react';
import { CivicProvider, useCivic } from './context/CivicContext';
import { TopNav } from './components/TopNav';
import { KPISummaryStrip } from './components/KPISummaryStrip';
import { DashboardView } from './components/DashboardView';
import { IssuesTrackerView } from './components/IssuesTrackerView';
import { ReviewQueueView } from './components/ReviewQueueView';
import { CitizenPortalView } from './components/CitizenPortalView';
import { BenchmarkLabView } from './components/BenchmarkLabView';
import { DeliverablesView } from './components/DeliverablesView';
import { NewComplaintModal } from './components/NewComplaintModal';

const MainContent: React.FC = () => {
  const { activeTab, setActiveTab } = useCivic();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* 3-Zone Top Navigation Contract */}
      <TopNav onOpenNewComplaintModal={() => setIsModalOpen(true)} />

      {/* High-Density Operational KPI Strip */}
      <KPISummaryStrip />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'issues' && <IssuesTrackerView />}
        {activeTab === 'review' && <ReviewQueueView />}
        {activeTab === 'citizen' && <CitizenPortalView />}
        {activeTab === 'benchmark' && <BenchmarkLabView />}
        {activeTab === 'deliverables' && <DeliverablesView />}
      </main>

      {/* New Complaint Intake Modal */}
      <NewComplaintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Clean Municipal Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">CivicMerge</span>
            <span>·</span>
            <span>Municipal Multi-Department Deduplication & Issue Tracking Engine</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('deliverables')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Demo Script (3:00)
            </button>
            <button
              onClick={() => setActiveTab('deliverables')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Project Report
            </button>
            <button
              onClick={() => setActiveTab('benchmark')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Edge-Case Test Suite
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <CivicProvider>
      <MainContent />
    </CivicProvider>
  );
}
