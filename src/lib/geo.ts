/**
 * Geospatial distance and decay utilities
 */

import { LocationCoords } from '../types';

/**
 * Calculates Great-Circle distance in meters between two lat/lng coordinates using the Haversine formula
 */
export function calculateHaversineDistanceMeters(
  loc1: { lat: number; lng: number },
  loc2: { lat: number; lng: number }
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const dLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((loc1.lat * Math.PI) / 180) *
      Math.cos((loc2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Computes a smooth geographic proximity score between 0.0 and 1.0.
 * Municipal issues within 25m get ~1.0; at 100m ~0.5; at 250m+ drops to 0.0.
 */
export function computeGeoProximityScore(distanceMeters: number | null): number {
  if (distanceMeters === null) {
    // Missing location fallback: neutral default with lower confidence
    return 0.4;
  }
  
  if (distanceMeters <= 20) return 1.0;
  if (distanceMeters >= 300) return 0.0;
  
  // Exponential decay
  const score = Math.exp(-distanceMeters / 80);
  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}

/**
 * Calculates centroid location for a set of coordinates
 */
export function calculateCentroid(locations: LocationCoords[]): LocationCoords {
  if (locations.length === 0) {
    return { lat: 37.7749, lng: -122.4194, address: 'Central Ward' };
  }
  
  const total = locations.reduce(
    (acc, loc) => ({
      lat: acc.lat + loc.lat,
      lng: acc.lng + loc.lng,
    }),
    { lat: 0, lng: 0 }
  );
  
  return {
    lat: Number((total.lat / locations.length).toFixed(6)),
    lng: Number((total.lng / locations.length).toFixed(6)),
    address: locations[0].address,
    ward: locations[0].ward,
  };
}
