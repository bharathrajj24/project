import React, { useState } from 'react';
import { useCivic } from '../context/CivicContext';
import { Issue } from '../types';

export const MunicipalMap: React.FC = () => {
  const { issues, complaints, setSelectedIssueId, setActiveTab } = useCivic();
  const [hoveredIssue, setHoveredIssue] = useState<Issue | null>(null);

  // Approximate coordinate normalization to SVG viewBox 0 0 800 450
  // San Francisco bounds: Lat ~37.74 to 37.80, Lng ~-122.48 to -122.40
  const minLat = 37.74;
  const maxLat = 37.805;
  const minLng = -122.485;
  const maxLng = -122.40;

  const projectToSvg = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 720 + 40;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 370 + 40;
    return { x: Math.max(30, Math.min(770, x)), y: Math.max(30, Math.min(420, y)) };
  };

  const categoryColor: Record<string, string> = {
    'Roads & Pavement': '#2563EB', // Blue
    'Stormwater & Drainage': '#0D9488', // Teal
    'Street Lighting & Signals': '#D97706', // Amber
    'Sanitation & Waste': '#059669', // Emerald
    'Building & Zoning Permits': '#7C3AED', // Purple
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Municipal Geospatial Issue Map</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic consolidation of multi-department complaints into shared municipal site pins.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Roads
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" /> Drainage
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" /> Lighting
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Sanitation
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /> Permits
          </span>
        </div>
      </div>

      <div className="relative bg-slate-900 aspect-16/9 w-full overflow-hidden select-none">
        {/* SVG Map Grid & City Sectors */}
        <svg viewBox="0 0 800 450" className="w-full h-full">
          {/* Subtle Sector Grid Lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="800" height="450" fill="#0B132B" />
          <rect width="800" height="450" fill="url(#grid)" />

          {/* Simulated Municipal Corridors and Coastline */}
          <path
            d="M 50 180 Q 250 200 400 280 T 750 350"
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="8"
          />
          <path
            d="M 120 40 Q 300 120 450 150 T 780 180"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="6"
          />
          <path
            d="M 420 30 L 410 430"
            fill="none"
            stroke="rgba(255, 255, 255, 0.09)"
            strokeWidth="5"
          />

          {/* Sector / Ward Labels */}
          <text x="120" y="80" fill="rgba(255, 255, 255, 0.25)" fontSize="11" fontFamily="sans-serif">WARD 6 (North)</text>
          <text x="480" y="80" fill="rgba(255, 255, 255, 0.25)" fontSize="11" fontFamily="sans-serif">WARD 1 (Financial/Downtown)</text>
          <text x="320" y="240" fill="rgba(255, 255, 255, 0.3)" fontSize="11" fontWeight="bold" fontFamily="sans-serif">WARD 3 (Central Elm Corridor)</text>
          <text x="120" y="320" fill="rgba(255, 255, 255, 0.25)" fontSize="11" fontFamily="sans-serif">WARD 7 (West End)</text>
          <text x="500" y="380" fill="rgba(255, 255, 255, 0.25)" fontSize="11" fontFamily="sans-serif">WARD 5 (South Oak District)</text>

          {/* Clustered Complaint Rays connecting raw reports to Issue Centroid */}
          {hoveredIssue && (
            <g>
              {hoveredIssue.linkedComplaintIds.map((cId, idx) => {
                const comp = complaints.find(c => c.id === cId);
                if (!comp || !comp.location) return null;
                const cPt = projectToSvg(comp.location.lat, comp.location.lng);
                const iPt = projectToSvg(hoveredIssue.location.lat, hoveredIssue.location.lng);
                return (
                  <g key={cId}>
                    <line
                      x1={cPt.x + (idx - 1) * 6}
                      y1={cPt.y + (idx - 1) * 6}
                      x2={iPt.x}
                      y2={iPt.y}
                      stroke={categoryColor[hoveredIssue.category] || '#60A5FA'}
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity="0.8"
                    />
                    <circle
                      cx={cPt.x + (idx - 1) * 6}
                      cy={cPt.y + (idx - 1) * 6}
                      r="3.5"
                      fill="#FFFFFF"
                      opacity="0.9"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Issue Pins */}
          {issues.map(issue => {
            const pt = projectToSvg(issue.location.lat, issue.location.lng);
            const count = issue.linkedComplaintIds.length;
            const color = categoryColor[issue.category] || '#3B82F6';
            const isHovered = hoveredIssue?.id === issue.id;

            return (
              <g
                key={issue.id}
                transform={`translate(${pt.x}, ${pt.y})`}
                className="cursor-pointer transition-transform"
                onMouseEnter={() => setHoveredIssue(issue)}
                onMouseLeave={() => setHoveredIssue(null)}
                onClick={() => {
                  setSelectedIssueId(issue.id);
                  setActiveTab('issues');
                }}
              >
                {/* Glow ring on hover */}
                {isHovered && (
                  <circle
                    r={22}
                    fill={color}
                    opacity="0.25"
                  />
                )}
                {/* Outer base circle */}
                <circle
                  r={count > 1 ? 14 : 9}
                  fill={color}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                {/* Cluster Count Text if > 1 */}
                {count > 1 && (
                  <text
                    y="4"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIssue && (
          <div className="absolute top-4 left-4 z-10 bg-slate-900/90 text-white p-3 rounded-lg border border-slate-700 shadow-xl max-w-sm pointer-events-none text-xs backdrop-blur-xs">
            <div className="font-semibold text-slate-100 flex items-center justify-between">
              <span>{hoveredIssue.id}</span>
              <span className="font-mono tabular-nums text-blue-400">
                {hoveredIssue.linkedComplaintIds.length} Linked Complaints
              </span>
            </div>
            <p className="text-slate-300 mt-1 line-clamp-2">{hoveredIssue.title}</p>
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400">
              <span>{hoveredIssue.location.address}</span>
              <span className="capitalize">{hoveredIssue.status.replace('_', ' ')}</span>
            </div>
          </div>
        )}

        <div className="absolute bottom-3 right-4 text-slate-400 text-xs bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800">
          Click any pin to inspect consolidated multi-department tickets
        </div>
      </div>
    </div>
  );
};
