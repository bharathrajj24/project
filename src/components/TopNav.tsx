import React from 'react';
import { useCivic } from '../context/CivicContext';

interface TopNavProps {
  onOpenNewComplaintModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenNewComplaintModal }) => {
  const { activeTab, setActiveTab, reviewQueue } = useCivic();

  const navItems = [
    { id: 'dashboard', label: 'Operations Dashboard' },
    { id: 'issues', label: 'Underlying Issues' },
    { id: 'review', label: `Review Queue ${reviewQueue.length > 0 ? `(${reviewQueue.length})` : ''}` },
    { id: 'citizen', label: 'Citizen Portal' },
    { id: 'benchmark', label: 'Evaluation & Lab' },
    { id: 'deliverables', label: 'Deliverables & Video' },
  ] as const;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single text element, no subtitles) */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left cursor-pointer"
        >
          CivicMerge
        </button>

        {/* Zone 2: Navigation Links (concise, single-line text links) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 text-sm cursor-pointer ${
                activeTab === item.id
                  ? 'text-slate-900 border-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Primary Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenNewComplaintModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            + Intake Report
          </button>
        </div>
      </div>

      {/* Mobile navigation row */}
      <div className="lg:hidden flex overflow-x-auto px-6 py-2 gap-4 border-t border-slate-100 text-xs">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`whitespace-nowrap py-1 cursor-pointer ${
              activeTab === item.id
                ? 'text-slate-900 font-semibold border-b border-slate-900'
                : 'text-slate-600'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
