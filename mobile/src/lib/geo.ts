/** Small geographic helpers shared by the map, alerts and drive mode. */

export type LatLon = { lat: number; lon: number };

/** Downtown Austin (Congress Ave bridge). Used when GPS is off or the user is far away. */
export const AUSTIN_CENTER: LatLon = { lat: 30.2672, lon: -97.7431 };

/** Users farther than this from Austin are treated as outside the coverage area. */
export const COVERAGE_RADIUS_KM = 80;

export function distanceKm(a: LatLon, b: LatLon): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const kmToMi = (km: number) => km * 0.621371;
export const miToKm = (mi: number) => mi / 0.621371;

/** "0.4 mi", "3 mi", "12 mi" */
export function formatMiles(km: number): string {
  const mi = kmToMi(km);
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

export function insideCoverage(p: LatLon): boolean {
  return distanceKm(p, AUSTIN_CENTER) <= COVERAGE_RADIUS_KM;
}
