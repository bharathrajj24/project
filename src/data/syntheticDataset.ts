/**
 * Synthetic Municipal Dataset Generator with fixed PRNG seed for reproducible evaluation.
 * Contains true duplicates, cross-department reports, paraphrased wording, spelling errors,
 * nearby-unrelated controls, cross-category controls, post-resolution reports, and missing location edge cases.
 */

import { Category, Complaint, Department, Issue, ResolutionEvent } from '../types';

// Seeded pseudo-random number generator (Mulberry32)
export function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SyntheticDatasetBundle {
  complaints: Complaint[];
  groundTruthIssues: Record<string, { title: string; category: Category; expectedCount: number }>;
  initialIssues: Issue[];
  metadata: {
    generatedAt: string;
    randomSeed: number;
    totalComplaints: number;
    expectedUniqueIssues: number;
    expectedDuplicates: number;
    expectedConsolidationRate: number;
  };
}

/**
 * Standard fixed seed generator to guarantee identical reproducible benchmarks.
 */
export function generateSyntheticDataset(seed = 42): SyntheticDatasetBundle {
  const prng = createPRNG(seed);

  // Predefined Ground Truth Clusters (hidden from deduplication algorithms during testing)
  const groundTruthIssues: Record<string, { title: string; category: Category; expectedCount: number }> = {
    'GT-ISS-101': {
      title: 'Severe pavement subsidence and pothole at 450 Elm Street',
      category: 'Roads & Pavement',
      expectedCount: 5, // 1 anchor + 4 duplicates
    },
    'GT-ISS-102': {
      title: 'Stormwater catch-basin blockage causing street ponding on 4th & Market',
      category: 'Stormwater & Drainage',
      expectedCount: 4, // 1 anchor + 3 duplicates
    },
    'GT-ISS-103': {
      title: 'Damaged luminaire fixture and exposed wiring on Oak Street Pole #42',
      category: 'Street Lighting & Signals',
      expectedCount: 3, // 1 anchor + 2 duplicates
    },
    'GT-ISS-104': {
      title: 'Illegal commercial dumpster dumping in alleyway behind 820 Pine Ave',
      category: 'Sanitation & Waste',
      expectedCount: 3, // 1 anchor + 2 duplicates
    },
    'GT-ISS-105': {
      title: 'Unpermitted structural excavation and sidewalk encroachment on Beacon St',
      category: 'Building & Zoning Permits',
      expectedCount: 3, // 1 anchor + 2 duplicates
    },
    'GT-ISS-106': {
      title: 'Deep frost heave fissure on North Boulevard near Mile 4',
      category: 'Roads & Pavement',
      expectedCount: 2, // 1 anchor + 1 duplicate
    },
    'GT-ISS-107': {
      title: 'Recurrent streetlight flickering after repair at Birch Street & 8th',
      category: 'Street Lighting & Signals',
      expectedCount: 2, // Resolved issue receives new complaint scenario
    },
    // Distinct single complaints (controls & edge cases)
    'GT-ISS-SINGLE-201': {
      title: 'Sidewalk cracked by overgrown elm tree roots at 452 Elm Street (Distinct from road pothole)',
      category: 'Roads & Pavement',
      expectedCount: 1, // Control: 15m from GT-ISS-101 but unrelated problem
    },
    'GT-ISS-SINGLE-202': {
      title: 'Traffic signal timing malfunction at 4th & Market (Distinct from drainage pool)',
      category: 'Street Lighting & Signals',
      expectedCount: 1, // Control: Same intersection as GT-ISS-102, different category
    },
    'GT-ISS-SINGLE-203': {
      title: 'Pothole on West End Avenue (Same category as 101, but 4.2km away)',
      category: 'Roads & Pavement',
      expectedCount: 1, // Control: Same category, completely different location
    },
    'GT-ISS-SINGLE-204': {
      title: 'Phone-in complaint: Broken storm drain grating without exact GPS coords',
      category: 'Stormwater & Drainage',
      expectedCount: 1, // Edge case: missing location coordinates
    },
    'GT-ISS-SINGLE-205': {
      title: 'Borderline damp pavement / suspected main seepage on Willow St',
      category: 'Stormwater & Drainage',
      expectedCount: 1, // Ambiguous case for review queue
    },
    'GT-ISS-SINGLE-206': {
      title: 'Residential fence permit dispute on Maple Court',
      category: 'Building & Zoning Permits',
      expectedCount: 1,
    },
    'GT-ISS-SINGLE-207': {
      title: 'Overflowing public litter receptacle at Central Plaza Bus Stop',
      category: 'Sanitation & Waste',
      expectedCount: 1,
    },
    'GT-ISS-SINGLE-208': {
      title: 'Damaged crosswalk push-button pedestrian signal on Cedar Lane',
      category: 'Street Lighting & Signals',
      expectedCount: 1,
    },
  };

  const rawComplaints: Complaint[] = [
    // --- CLUSTER 1: 450 Elm Street Pothole (5 reports, cross-department, typos, paraphrased) ---
    {
      id: 'CMP-2026-1011',
      citizenRef: 'CIT-9801',
      description: 'Massive pothole in front of 450 Elm St. Smashed my wheel rim on the southbound lane.',
      category: 'Roads & Pavement',
      location: { lat: 37.774929, lng: -122.419416, address: '450 Elm St, Ward 3', ward: 'Ward 3' },
      timestamp: '2026-10-24T08:15:00Z',
      department: '311 Unified Contact Center',
      status: 'linked',
      imageFeatureHash: 'hash_road_pothole_a1',
      groundTruthIssueId: 'GT-ISS-101',
    },
    {
      id: 'CMP-2026-1012',
      citizenRef: 'CIT-4412',
      description: 'Deep road cavity and cracked asphalt near 452 Elm St blocking right vehicle lane.',
      category: 'Roads & Pavement',
      location: { lat: 37.774935, lng: -122.419430, address: '452 Elm St, Ward 3', ward: 'Ward 3' },
      timestamp: '2026-10-24T10:30:00Z',
      department: 'Transportation',
      status: 'linked',
      imageFeatureHash: 'hash_road_pothole_a2',
      groundTruthIssueId: 'GT-ISS-101',
    },
    {
      id: 'CMP-2026-1013',
      citizenRef: 'CIT-7731',
      description: 'Dangerous pot hole on elm street, cars swerving into oncoming traffic to dodge crater.',
      category: 'Roads & Pavement',
      location: { lat: 37.774915, lng: -122.419405, address: '448 Elm St, Ward 3', ward: 'Ward 3' },
      timestamp: '2026-10-24T14:45:00Z',
      department: 'Public Works',
      status: 'linked',
      imageFeatureHash: 'hash_road_pothole_a1',
      groundTruthIssueId: 'GT-ISS-101',
    },
    {
      id: 'CMP-2026-1014',
      citizenRef: 'CIT-1109',
      description: 'Pavement depression crater at 450 Elm St, severe hazard for bicycles and motorbikes.',
      category: 'Roads & Pavement',
      location: { lat: 37.774930, lng: -122.419420, address: '450 Elm St, Ward 3', ward: 'Ward 3' },
      timestamp: '2026-10-25T09:00:00Z',
      department: '311 Unified Contact Center',
      status: 'linked',
      imageFeatureHash: 'hash_road_pothole_a2',
      groundTruthIssueId: 'GT-ISS-101',
    },
    {
      id: 'CMP-2026-1015',
      citizenRef: 'CIT-8234',
      description: 'Bad pot-hole on elm st road surface needs asphalt repair urgently.',
      category: 'Roads & Pavement',
      location: { lat: 37.774925, lng: -122.419412, address: '450 Elm St, Ward 3', ward: 'Ward 3' },
      timestamp: '2026-10-25T16:20:00Z',
      department: 'Transportation',
      status: 'linked',
      imageFeatureHash: 'hash_road_pothole_a1',
      groundTruthIssueId: 'GT-ISS-101',
    },

    // --- CLUSTER 2: 4th & Market Catch Basin Blockage (4 reports) ---
    {
      id: 'CMP-2026-1021',
      citizenRef: 'CIT-3301',
      description: 'Storm drain completely clogged with debris at corner of 4th and Market St. Water backing up.',
      category: 'Stormwater & Drainage',
      location: { lat: 37.785810, lng: -122.406520, address: '4th St & Market St, Ward 1', ward: 'Ward 1' },
      timestamp: '2026-10-25T07:10:00Z',
      department: 'Water Resources',
      status: 'linked',
      imageFeatureHash: 'hash_drain_overflow_b1',
      groundTruthIssueId: 'GT-ISS-102',
    },
    {
      id: 'CMP-2026-1022',
      citizenRef: 'CIT-5590',
      description: 'Street flooding at 4th & Market due to blocked stormwater grating and catchbasin.',
      category: 'Stormwater & Drainage',
      location: { lat: 37.785822, lng: -122.406535, address: '400 Market St, Ward 1', ward: 'Ward 1' },
      timestamp: '2026-10-25T08:40:00Z',
      department: '311 Unified Contact Center',
      status: 'linked',
      imageFeatureHash: 'hash_drain_overflow_b2',
      groundTruthIssueId: 'GT-ISS-102',
    },
    {
      id: 'CMP-2026-1023',
      citizenRef: 'CIT-6621',
      description: 'Water accumulation across pedestrian crosswalk at fourth and market. Sewer drain blocked.',
      category: 'Stormwater & Drainage',
      location: { lat: 37.785795, lng: -122.406510, address: '4th St & Market St, Ward 1', ward: 'Ward 1' },
      timestamp: '2026-10-25T11:15:00Z',
      department: 'Public Works',
      status: 'linked',
      imageFeatureHash: 'hash_drain_overflow_b1',
      groundTruthIssueId: 'GT-ISS-102',
    },
    {
      id: 'CMP-2026-1024',
      citizenRef: 'CIT-2219',
      description: 'Gutter overflow and flooded curb at Market and 4th, catch basin full of leaves.',
      category: 'Stormwater & Drainage',
      location: { lat: 37.785815, lng: -122.406525, address: '4th St & Market St, Ward 1', ward: 'Ward 1' },
      timestamp: '2026-10-25T13:50:00Z',
      department: 'Water Resources',
      status: 'linked',
      imageFeatureHash: 'hash_drain_overflow_b1',
      groundTruthIssueId: 'GT-ISS-102',
    },

    // --- CLUSTER 3: Oak Street Luminaire #42 (3 reports) ---
    {
      id: 'CMP-2026-1031',
      citizenRef: 'CIT-1288',
      description: 'Streetlight pole 42 on Oak Street has hanging fixture and exposed wires. Sidewalk dark.',
      category: 'Street Lighting & Signals',
      location: { lat: 37.771204, lng: -122.424105, address: '120 Oak St, Ward 5', ward: 'Ward 5' },
      timestamp: '2026-10-26T19:20:00Z',
      department: 'Transportation',
      status: 'linked',
      imageFeatureHash: 'hash_light_fixture_c1',
      groundTruthIssueId: 'GT-ISS-103',
    },
    {
      id: 'CMP-2026-1032',
      citizenRef: 'CIT-9014',
      description: 'Lamp post fixture broken and dangling on Oak St near #120, blacked out street lamp.',
      category: 'Street Lighting & Signals',
      location: { lat: 37.771210, lng: -122.424115, address: '122 Oak St, Ward 5', ward: 'Ward 5' },
      timestamp: '2026-10-26T21:05:00Z',
      department: '311 Unified Contact Center',
      status: 'linked',
      imageFeatureHash: 'hash_light_fixture_c2',
      groundTruthIssueId: 'GT-ISS-103',
    },
    {
      id: 'CMP-2026-1033',
      citizenRef: 'CIT-3841',
      description: 'Streetlight out on Oak St pole 42, luminaire detached and swinging in wind.',
      category: 'Street Lighting & Signals',
      location: { lat: 37.771198, lng: -122.424095, address: '118 Oak St, Ward 5', ward: 'Ward 5' },
      timestamp: '2026-10-27T02:30:00Z',
      department: 'Public Works',
      status: 'linked',
      imageFeatureHash: 'hash_light_fixture_c1',
      groundTruthIssueId: 'GT-ISS-103',
    },

    // --- CLUSTER 4: 820 Pine Ave Illegal Dumping (3 reports) ---
    {
      id: 'CMP-2026-1041',
      citizenRef: 'CIT-7023',
      description: 'Commercial waste and construction debris dumped in public alley behind 820 Pine Ave.',
      category: 'Sanitation & Waste',
      location: { lat: 37.791240, lng: -122.411050, address: '820 Pine Ave, Ward 2', ward: 'Ward 2' },
      timestamp: '2026-10-26T06:50:00Z',
      department: 'Parks & Sanitation',
      status: 'linked',
      imageFeatureHash: 'hash_waste_dump_d1',
      groundTruthIssueId: 'GT-ISS-104',
    },
    {
      id: 'CMP-2026-1042',
      citizenRef: 'CIT-5117',
      description: 'Illegal trash dumping behind 820 Pine alleyway, mattresses and drywall blocking vehicle path.',
      category: 'Sanitation & Waste',
      location: { lat: 37.791245, lng: -122.411065, address: '822 Pine Ave Alley, Ward 2', ward: 'Ward 2' },
      timestamp: '2026-10-26T09:15:00Z',
      department: 'Code Compliance',
      status: 'linked',
      imageFeatureHash: 'hash_waste_dump_d2',
      groundTruthIssueId: 'GT-ISS-104',
    },
    {
      id: 'CMP-2026-1043',
      citizenRef: 'CIT-6402',
      description: 'Piles of refuse and dumped garbage behind 820 Pine Avenue, vermin concern.',
      category: 'Sanitation & Waste',
      location: { lat: 37.791235, lng: -122.411040, address: '820 Pine Ave, Ward 2', ward: 'Ward 2' },
      timestamp: '2026-10-26T14:00:00Z',
      department: '311 Unified Contact Center',
      status: 'linked',
      imageFeatureHash: 'hash_waste_dump_d1',
      groundTruthIssueId: 'GT-ISS-104',
    },

    // --- CLUSTER 5: Beacon St Permit Violation (3 reports) ---
    {
      id: 'CMP-2026-1051',
      citizenRef: 'CIT-4192',
      description: 'Contractor excavating past property line and obstructing public sidewalk without permit sign at 310 Beacon.',
      category: 'Building & Zoning Permits',
      location: { lat: 37.768120, lng: -122.435210, address: '310 Beacon St, Ward 4', ward: 'Ward 4' },
      timestamp: '2026-10-27T10:00:00Z',
      department: 'Code Compliance',
      status: 'linked',
      imageFeatureHash: 'hash_permit_excavate_e1',
      groundTruthIssueId: 'GT-ISS-105',
    },
    {
      id: 'CMP-2026-1052',
      citizenRef: 'CIT-8820',
      description: 'Unpermitted construction encroachment and trench digging on public way at 310 Beacon Street.',
      category: 'Building & Zoning Permits',
      location: { lat: 37.768125, lng: -122.435220, address: '310 Beacon St, Ward 4', ward: 'Ward 4' },
      timestamp: '2026-10-27T11:45:00Z',
      department: 'Public Works',
      status: 'linked',
      imageFeatureHash: 'hash_permit_excavate_e2',
      groundTruthIssueId: 'GT-ISS-105',
    },
    {
      id: 'CMP-2026-1053',
      citizenRef: 'CIT-3101',
      description: 'Sidewalk blocked by construction trench at 312 Beacon, no pedestrian detour or building permit posted.',
      category: 'Building & Zoning Permits',
      location: { lat: 37.768115, lng: -122.435205, address: '312 Beacon St, Ward 4', ward: 'Ward 4' },
      timestamp: '2026-10-27T15:10:00Z',
      department: '311 Unified Contact Center',
      status: 'linked',
      imageFeatureHash: 'hash_permit_excavate_e1',
      groundTruthIssueId: 'GT-ISS-105',
    },

    // --- CLUSTER 6: North Blvd Frost Heave (2 reports) ---
    {
      id: 'CMP-2026-1061',
      citizenRef: 'CIT-9340',
      description: 'Deep road fissure and frost heave bump on North Boulevard near Mile Marker 4.',
      category: 'Roads & Pavement',
      location: { lat: 37.799510, lng: -122.428900, address: 'North Blvd & Mile 4, Ward 6', ward: 'Ward 6' },
      timestamp: '2026-10-27T12:00:00Z',
      department: 'Transportation',
      status: 'linked',
      imageFeatureHash: 'hash_road_fissure_f1',
      groundTruthIssueId: 'GT-ISS-106',
    },
    {
      id: 'CMP-2026-1062',
      citizenRef: 'CIT-2781',
      description: 'Severe bump and road crack on North Blvd at mile 4 jolting vehicles.',
      category: 'Roads & Pavement',
      location: { lat: 37.799520, lng: -122.428915, address: 'North Blvd, Ward 6', ward: 'Ward 6' },
      timestamp: '2026-10-27T16:30:00Z',
      department: 'Public Works',
      status: 'linked',
      imageFeatureHash: 'hash_road_fissure_f1',
      groundTruthIssueId: 'GT-ISS-106',
    },

    // --- CLUSTER 7: Birch St Resolved Streetlight Re-emergence (2 reports) ---
    {
      id: 'CMP-2026-1071',
      citizenRef: 'CIT-5040',
      description: 'Streetlight blinking intermittently at Birch St and 8th Avenue.',
      category: 'Street Lighting & Signals',
      location: { lat: 37.779100, lng: -122.418200, address: 'Birch St & 8th Ave, Ward 3', ward: 'Ward 3' },
      timestamp: '2026-10-10T19:00:00Z',
      department: 'Transportation',
      status: 'resolved',
      imageFeatureHash: 'hash_light_flicker_g1',
      groundTruthIssueId: 'GT-ISS-107',
    },
    {
      id: 'CMP-2026-1072',
      citizenRef: 'CIT-5049',
      description: 'Street light on Birch and 8th was fixed last week but is flickering again tonight.',
      category: 'Street Lighting & Signals',
      location: { lat: 37.779105, lng: -122.418210, address: 'Birch St & 8th Ave, Ward 3', ward: 'Ward 3' },
      timestamp: '2026-10-28T20:15:00Z',
      department: '311 Unified Contact Center',
      status: 'received',
      imageFeatureHash: 'hash_light_flicker_g1',
      groundTruthIssueId: 'GT-ISS-107',
    },

    // --- CONTROLS & EDGE CASES (Distinct Single Reports) ---
    // Control 1: Nearby Unrelated (15m from 450 Elm pothole, but it is a tree root cracked sidewalk!)
    {
      id: 'CMP-2026-2001',
      citizenRef: 'CIT-6019',
      description: 'Large city elm tree roots pushing up concrete sidewalk slabs at 452 Elm Street, tripping hazard.',
      category: 'Roads & Pavement',
      location: { lat: 37.774940, lng: -122.419445, address: '452 Elm St, Ward 3', ward: 'Ward 3' },
      timestamp: '2026-10-25T11:00:00Z',
      department: 'Public Works',
      status: 'received',
      imageFeatureHash: 'hash_tree_root_sidewalk',
      groundTruthIssueId: 'GT-ISS-SINGLE-201',
    },
    // Control 2: Same intersection as Market & 4th, but Traffic Signal instead of Drainage!
    {
      id: 'CMP-2026-2002',
      citizenRef: 'CIT-7411',
      description: 'Pedestrian countdown signal stuck on don\'t walk at 4th and Market St crossing.',
      category: 'Street Lighting & Signals',
      location: { lat: 37.785812, lng: -122.406522, address: '4th St & Market St, Ward 1', ward: 'Ward 1' },
      timestamp: '2026-10-25T12:00:00Z',
      department: 'Transportation',
      status: 'received',
      imageFeatureHash: 'hash_traffic_signal_box',
      groundTruthIssueId: 'GT-ISS-SINGLE-202',
    },
    // Control 3: Same category as Elm St (Roads), but 4.2 km away on West End Ave!
    {
      id: 'CMP-2026-2003',
      citizenRef: 'CIT-8922',
      description: 'Pothole on West End Avenue near intersection with 30th St.',
      category: 'Roads & Pavement',
      location: { lat: 37.741000, lng: -122.482000, address: 'West End Ave & 30th St, Ward 7', ward: 'Ward 7' },
      timestamp: '2026-10-26T10:00:00Z',
      department: 'Public Works',
      status: 'received',
      imageFeatureHash: 'hash_road_pothole_a1',
      groundTruthIssueId: 'GT-ISS-SINGLE-203',
    },
    // Edge Case 1: Missing Location Coordinates
    {
      id: 'CMP-2026-2004',
      citizenRef: 'CIT-1599',
      description: 'Phone call complaint: Storm drain grating bent and rattling near 7th Street commercial district.',
      category: 'Stormwater & Drainage',
      location: undefined, // Missing coordinates test
      timestamp: '2026-10-26T15:30:00Z',
      department: '311 Unified Contact Center',
      status: 'received',
      imageFeatureHash: 'hash_drain_overflow_b1',
      groundTruthIssueId: 'GT-ISS-SINGLE-204',
    },
    // Edge Case 2: Ambiguous Case for Review Queue (borderline score ~0.62)
    {
      id: 'CMP-2026-2005',
      citizenRef: 'CIT-4481',
      description: 'Persistent street moisture and standing puddle on Willow St, unclear if leaking lateral or gutter pooling.',
      category: 'Stormwater & Drainage',
      location: { lat: 37.781200, lng: -122.415000, address: '220 Willow St, Ward 3', ward: 'Ward 3' },
      timestamp: '2026-10-27T08:00:00Z',
      department: 'Water Resources',
      status: 'received',
      imageFeatureHash: 'hash_water_seepage',
      groundTruthIssueId: 'GT-ISS-SINGLE-205',
    },
    // Control 4: Permit dispute on Maple Court
    {
      id: 'CMP-2026-2006',
      citizenRef: 'CIT-3810',
      description: 'Neighbor building 8-foot privacy fence exceeding residential height permit limits on Maple Court.',
      category: 'Building & Zoning Permits',
      location: { lat: 37.755000, lng: -122.430000, address: '44 Maple Court, Ward 8', ward: 'Ward 8' },
      timestamp: '2026-10-27T14:20:00Z',
      department: 'Code Compliance',
      status: 'received',
      imageFeatureHash: 'hash_fence_permit',
      groundTruthIssueId: 'GT-ISS-SINGLE-206',
    },
    // Control 5: Overflowing trash bin
    {
      id: 'CMP-2026-2007',
      citizenRef: 'CIT-7299',
      description: 'Public litter can overflowing at Central Plaza bus terminal, rubbish spilling onto sidewalk.',
      category: 'Sanitation & Waste',
      location: { lat: 37.788000, lng: -122.408000, address: 'Central Plaza Bus Stop, Ward 1', ward: 'Ward 1' },
      timestamp: '2026-10-28T09:30:00Z',
      department: 'Parks & Sanitation',
      status: 'received',
      imageFeatureHash: 'hash_waste_dump_d1',
      groundTruthIssueId: 'GT-ISS-SINGLE-207',
    },
    // Control 6: Damaged crosswalk push button
    {
      id: 'CMP-2026-2008',
      citizenRef: 'CIT-9102',
      description: 'Pedestrian push-button speaker chirping continuously on Cedar Lane crossing.',
      category: 'Street Lighting & Signals',
      location: { lat: 37.765000, lng: -122.422000, address: 'Cedar Lane & 16th, Ward 5', ward: 'Ward 5' },
      timestamp: '2026-10-28T11:00:00Z',
      department: 'Transportation',
      status: 'received',
      imageFeatureHash: 'hash_traffic_signal_box',
      groundTruthIssueId: 'GT-ISS-SINGLE-208',
    },
  ];

  // Ground truth consolidation metrics:
  // Total complaints N = 28
  // Expected unique issues U = 15 (7 multi-complaint clusters + 8 single controls)
  // Expected consolidated duplicates D = 13 (28 - 15 = 13)
  // Expected consolidation rate = 13 / 28 = 46.4%

  // Build the live consolidated underlying issues matching the current production state
  const initialIssues: Issue[] = [
    {
      id: 'ISS-2026-001',
      title: 'Pavement Subsidence & Deep Pothole on Elm Street Corridor',
      category: 'Roads & Pavement',
      leadDepartment: 'Public Works',
      priority: 'high',
      status: 'in_progress',
      location: { lat: 37.774929, lng: -122.419416, address: '450 Elm St, Ward 3', ward: 'Ward 3' },
      linkedComplaintIds: ['CMP-2026-1011', 'CMP-2026-1012', 'CMP-2026-1013', 'CMP-2026-1014', 'CMP-2026-1015'],
      departmentCounts: {
        'Public Works': 1,
        'Transportation': 2,
        '311 Unified Contact Center': 2,
        'Water Resources': 0,
        'Code Compliance': 0,
        'Parks & Sanitation': 0,
      },
      firstReportedAt: '2026-10-24T08:15:00Z',
      lastReportedAt: '2026-10-25T16:20:00Z',
      resolutionNotes: 'Asphalt milling crew dispatched. Surface patched with hot-mix asphalt scheduled for full leveling on Oct 30.',
      resolutionEvents: [
        {
          id: 'EVT-101-1',
          timestamp: '2026-10-24T08:15:00Z',
          eventType: 'reported',
          actingDepartment: '311 Unified Contact Center',
          notes: 'Initial citizen report received via 311 portal.',
          actorName: 'Dispatch System',
        },
        {
          id: 'EVT-101-2',
          timestamp: '2026-10-24T10:35:00Z',
          eventType: 'triaged',
          actingDepartment: 'Transportation',
          notes: 'Transportation patrol confirmed hazard on southbound lane. Auto-deduplicated with 311 report.',
          actorName: 'Officer J. Vance',
        },
        {
          id: 'EVT-101-3',
          timestamp: '2026-10-24T15:00:00Z',
          eventType: 'assigned',
          actingDepartment: 'Public Works',
          notes: 'Assigned to Public Works Road Maintenance Crew #4.',
          actorName: 'Supervisor T. Morales',
        },
        {
          id: 'EVT-101-4',
          timestamp: '2026-10-25T09:30:00Z',
          eventType: 'in_progress',
          actingDepartment: 'Public Works',
          notes: 'Traffic cones deployed; temporary cold patch applied; awaiting full hot-pour seal.',
          actorName: 'Crew Lead R. Gomez',
        },
      ],
    },
    {
      id: 'ISS-2026-002',
      title: 'Stormwater Catch Basin Blockage & Street Ponding at 4th & Market',
      category: 'Stormwater & Drainage',
      leadDepartment: 'Water Resources',
      priority: 'urgent',
      status: 'in_progress',
      location: { lat: 37.785810, lng: -122.406520, address: '4th St & Market St, Ward 1', ward: 'Ward 1' },
      linkedComplaintIds: ['CMP-2026-1021', 'CMP-2026-1022', 'CMP-2026-1023', 'CMP-2026-1024'],
      departmentCounts: {
        'Water Resources': 2,
        '311 Unified Contact Center': 1,
        'Public Works': 1,
        'Transportation': 0,
        'Code Compliance': 0,
        'Parks & Sanitation': 0,
      },
      firstReportedAt: '2026-10-25T07:10:00Z',
      lastReportedAt: '2026-10-25T13:50:00Z',
      resolutionNotes: 'Vactor truck clearing leaf debris and silt from subterranean catch basin trap.',
      resolutionEvents: [
        {
          id: 'EVT-102-1',
          timestamp: '2026-10-25T07:10:00Z',
          eventType: 'reported',
          actingDepartment: 'Water Resources',
          notes: 'Clogged drain reported by municipal sensor monitor.',
          actorName: 'Telemetry Gateway',
        },
        {
          id: 'EVT-102-2',
          timestamp: '2026-10-25T08:45:00Z',
          eventType: 'in_progress',
          actingDepartment: 'Water Resources',
          notes: 'Stormwater response team en route with hydro-vacuum truck.',
          actorName: 'Coordinator S. Chen',
        },
      ],
    },
    {
      id: 'ISS-2026-003',
      title: 'Damaged Luminaire Fixture and Exposed Wiring on Oak Street Pole #42',
      category: 'Street Lighting & Signals',
      leadDepartment: 'Transportation',
      priority: 'urgent',
      status: 'assigned',
      location: { lat: 37.771204, lng: -122.424105, address: '120 Oak St, Ward 5', ward: 'Ward 5' },
      linkedComplaintIds: ['CMP-2026-1031', 'CMP-2026-1032', 'CMP-2026-1033'],
      departmentCounts: {
        'Transportation': 1,
        '311 Unified Contact Center': 1,
        'Public Works': 1,
        'Water Resources': 0,
        'Code Compliance': 0,
        'Parks & Sanitation': 0,
      },
      firstReportedAt: '2026-10-26T19:20:00Z',
      lastReportedAt: '2026-10-27T02:30:00Z',
      resolutionNotes: 'Electrical bucket truck scheduled for morning replacement of ballast and mounting arm.',
      resolutionEvents: [
        {
          id: 'EVT-103-1',
          timestamp: '2026-10-26T19:20:00Z',
          eventType: 'reported',
          actingDepartment: 'Transportation',
          notes: 'Reported by night safety patrol.',
          actorName: 'Patrol Officer D. Ross',
        },
        {
          id: 'EVT-103-2',
          timestamp: '2026-10-26T21:30:00Z',
          eventType: 'assigned',
          actingDepartment: 'Transportation',
          notes: 'Work order #LT-9402 generated and dispatched to electrical maintenance division.',
          actorName: 'Dispatcher M. Walsh',
        },
      ],
    },
    {
      id: 'ISS-2026-004',
      title: 'Commercial Debris and Trash Dumping in Pine Avenue Alleyway',
      category: 'Sanitation & Waste',
      leadDepartment: 'Parks & Sanitation',
      priority: 'medium',
      status: 'under_review',
      location: { lat: 37.791240, lng: -122.411050, address: '820 Pine Ave, Ward 2', ward: 'Ward 2' },
      linkedComplaintIds: ['CMP-2026-1041', 'CMP-2026-1042', 'CMP-2026-1043'],
      departmentCounts: {
        'Parks & Sanitation': 1,
        'Code Compliance': 1,
        '311 Unified Contact Center': 1,
        'Public Works': 0,
        'Transportation': 0,
        'Water Resources': 0,
      },
      firstReportedAt: '2026-10-26T06:50:00Z',
      lastReportedAt: '2026-10-26T14:00:00Z',
      resolutionNotes: 'Sanitation cleanup scheduled; Code Compliance checking commercial invoices for origin trace.',
      resolutionEvents: [
        {
          id: 'EVT-104-1',
          timestamp: '2026-10-26T06:50:00Z',
          eventType: 'reported',
          actingDepartment: 'Parks & Sanitation',
          notes: 'Alleyway inspection flagged 3 cubic yards of illegally dumped refuse.',
          actorName: 'Inspector K. Patel',
        },
      ],
    },
    {
      id: 'ISS-2026-005',
      title: 'Unpermitted Sidewalk Trench Excavation at 310 Beacon Street',
      category: 'Building & Zoning Permits',
      leadDepartment: 'Code Compliance',
      priority: 'high',
      status: 'under_review',
      location: { lat: 37.768120, lng: -122.435210, address: '310 Beacon St, Ward 4', ward: 'Ward 4' },
      linkedComplaintIds: ['CMP-2026-1051', 'CMP-2026-1052', 'CMP-2026-1053'],
      departmentCounts: {
        'Code Compliance': 1,
        'Public Works': 1,
        '311 Unified Contact Center': 1,
        'Transportation': 0,
        'Water Resources': 0,
        'Parks & Sanitation': 0,
      },
      firstReportedAt: '2026-10-27T10:00:00Z',
      lastReportedAt: '2026-10-27T15:10:00Z',
      resolutionNotes: 'Stop work order drafted. Building permit database indicates expired utility trench waiver.',
      resolutionEvents: [
        {
          id: 'EVT-105-1',
          timestamp: '2026-10-27T10:00:00Z',
          eventType: 'reported',
          actingDepartment: 'Code Compliance',
          notes: 'Stop-work notice warning served to on-site contractor.',
          actorName: 'Zoning Officer A. Kim',
        },
      ],
    },
    {
      id: 'ISS-2026-006',
      title: 'North Boulevard Road Fissure & Frost Heave at Mile 4',
      category: 'Roads & Pavement',
      leadDepartment: 'Transportation',
      priority: 'medium',
      status: 'assigned',
      location: { lat: 37.799510, lng: -122.428900, address: 'North Blvd & Mile 4, Ward 6', ward: 'Ward 6' },
      linkedComplaintIds: ['CMP-2026-1061', 'CMP-2026-1062'],
      departmentCounts: {
        'Transportation': 1,
        'Public Works': 1,
        '311 Unified Contact Center': 0,
        'Water Resources': 0,
        'Code Compliance': 0,
        'Parks & Sanitation': 0,
      },
      firstReportedAt: '2026-10-27T12:00:00Z',
      lastReportedAt: '2026-10-27T16:30:00Z',
      resolutionNotes: 'Highway division placed warning signs and scheduled crack seal operations.',
      resolutionEvents: [
        {
          id: 'EVT-106-1',
          timestamp: '2026-10-27T12:00:00Z',
          eventType: 'reported',
          actingDepartment: 'Transportation',
          notes: 'High-speed roadway inspection logged 2.5-inch elevation shift in pavement.',
          actorName: 'Highway Patrol Lead',
        },
      ],
    },
    {
      id: 'ISS-2026-007',
      title: 'Flickering Streetlight Luminaire on Birch Street & 8th Avenue',
      category: 'Street Lighting & Signals',
      leadDepartment: 'Transportation',
      priority: 'medium',
      status: 'reopened', // Tested in edge case runner!
      location: { lat: 37.779100, lng: -122.418200, address: 'Birch St & 8th Ave, Ward 3', ward: 'Ward 3' },
      linkedComplaintIds: ['CMP-2026-1071', 'CMP-2026-1072'],
      departmentCounts: {
        'Transportation': 1,
        '311 Unified Contact Center': 1,
        'Public Works': 0,
        'Water Resources': 0,
        'Code Compliance': 0,
        'Parks & Sanitation': 0,
      },
      firstReportedAt: '2026-10-10T19:00:00Z',
      lastReportedAt: '2026-10-28T20:15:00Z',
      resolutionNotes: 'Previously resolved on Oct 12 with bulb replacement. Reopened on Oct 28 due to driver capacitor defect.',
      resolutionEvents: [
        {
          id: 'EVT-107-1',
          timestamp: '2026-10-10T19:00:00Z',
          eventType: 'reported',
          actingDepartment: 'Transportation',
          notes: 'Initial flicker reported.',
          actorName: 'Dispatcher M. Walsh',
        },
        {
          id: 'EVT-107-2',
          timestamp: '2026-10-12T14:00:00Z',
          eventType: 'resolved',
          actingDepartment: 'Transportation',
          notes: 'Standard LED lamp swap performed. Issue marked Resolved.',
          actorName: 'Electrician P. Soto',
        },
        {
          id: 'EVT-107-3',
          timestamp: '2026-10-28T20:16:00Z',
          eventType: 'reopened',
          actingDepartment: '311 Unified Contact Center',
          notes: 'New complaint CMP-2026-1072 arrived 16 days after repair with 88% similarity. Auto-reopened per lifecycle policy.',
          actorName: 'Lifecycle Policy Engine',
        },
      ],
    },
  ];

  // Set linkedIssueId on initial raw complaints
  for (const issue of initialIssues) {
    for (const compId of issue.linkedComplaintIds) {
      const found = rawComplaints.find(c => c.id === compId);
      if (found) {
        found.linkedIssueId = issue.id;
      }
    }
  }

  const expectedUniqueIssues = Object.keys(groundTruthIssues).length; // 15
  const totalComplaints = rawComplaints.length; // 28
  const expectedDuplicates = totalComplaints - expectedUniqueIssues; // 13
  const expectedConsolidationRate = Number(((expectedDuplicates / totalComplaints) * 100).toFixed(1)); // 46.4%

  return {
    complaints: rawComplaints,
    groundTruthIssues,
    initialIssues,
    metadata: {
      generatedAt: '2026-10-29T03:00:00Z',
      randomSeed: seed,
      totalComplaints,
      expectedUniqueIssues,
      expectedDuplicates,
      expectedConsolidationRate,
    },
  };
}
