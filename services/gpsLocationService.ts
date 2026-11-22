/**
 * CareBridge GPS Location & Accuracy Precision Service
 * Handles GPS permissions, high-precision coordinates capture,
 * separate GPS accuracy evaluation, reverse-geocoding, and Haversine distance calculations.
 */

import * as Location from 'expo-location';

export type GpsAccuracyTier = 'good' | 'caution' | 'poor' | 'unknown';

export interface GpsLocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null; // in meters (radius of 68% confidence)
  accuracyTier: GpsAccuracyTier;
  accuracyLabel: string;
  accuracyDescription: string;
  timestamp: number;
  address?: string;
  isManual?: boolean;
}

export interface GpsPermissionState {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.PermissionStatus;
}

/**
 * Classifies device GPS accuracy into standard medical emergency dispatch tiers.
 * Important: 2 km is the search perimeter, NOT GPS accuracy.
 * GPS accuracy is device hardware measurement (in meters).
 */
export function evaluateGpsAccuracy(accuracyMeters: number | null | undefined): {
  tier: GpsAccuracyTier;
  label: string;
  description: string;
  color: string;
  bgColor: string;
} {
  if (accuracyMeters === null || accuracyMeters === undefined || isNaN(accuracyMeters)) {
    return {
      tier: 'unknown',
      label: 'Approximate Location',
      description: 'Coordinates provided manually or without satellite telemetry.',
      color: '#64748B',
      bgColor: '#F1F5F9',
    };
  }

  const rounded = Math.round(accuracyMeters);

  if (accuracyMeters <= 50) {
    return {
      tier: 'good',
      label: `Good GPS Estimate (±${rounded}m)`,
      description: `High-precision satellite lock. Accurate within ${rounded} meters. Optimal for emergency ambulance dispatch.`,
      color: '#15803D',
      bgColor: '#DCFCE7',
    };
  } else if (accuracyMeters <= 500) {
    return {
      tier: 'caution',
      label: `Usable with Caution (±${rounded}m)`,
      description: `Moderate precision (±${rounded}m). Emergency teams recommend verifying your street number, landmark, or floor.`,
      color: '#B45309',
      bgColor: '#FEF3C7',
    };
  } else {
    return {
      tier: 'poor',
      label: `Poor GPS Accuracy (±${rounded}m)`,
      description: `Low precision (±${rounded}m). Device cannot obtain a clear satellite fix. Please calibrate GPS or enter your street address manually.`,
      color: '#B91C1C',
      bgColor: '#FEE2E2',
    };
  }
}

/**
 * Calculates geographical distance in kilometers between two points using the Haversine formula.
 * This is actual spherical distance, not city-level approximation.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Return formatted to 2 decimal places (e.g., 0.85 km)
  return Math.round(distance * 100) / 100;
}

/**
 * Calculates compass bearing from origin to target in degrees (0 = North, 90 = East, 180 = South, 270 = West)
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = lat1 * (Math.PI / 180);
  const phi2 = lat2 * (Math.PI / 180);
  const deltaLambda = (lon2 - lon1) * (Math.PI / 180);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const bearing = ((theta * 180) / Math.PI + 360) % 360;
  return Math.round(bearing);
}

/**
 * Requests location permission and gets current high-accuracy GPS coordinates
 */
export async function getCurrentPatientLocation(): Promise<{
  success: boolean;
  data?: GpsLocationData;
  error?: string;
  permissionDenied?: boolean;
}> {
  try {
    // 1. Request foreground permission
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

    if (status !== Location.PermissionStatus.GRANTED) {
      return {
        success: false,
        permissionDenied: true,
        error:
          'Location permission was not granted. Please enable location permissions in settings, or enter your incident address manually.',
      };
    }

    // 2. Fetch current GPS position with High Accuracy
    let position: Location.LocationObject;
    try {
      position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
    } catch {
      // Fallback to last known position if active GPS timeout occurs
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        position = lastKnown;
      } else {
        throw new Error('Unable to retrieve current satellite fix.');
      }
    }

    const { latitude, longitude, accuracy } = position.coords;
    const evaluation = evaluateGpsAccuracy(accuracy);

    // 3. Attempt reverse-geocoding for patient convenience
    let readableAddress = '';
    try {
      const reverseList = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (reverseList && reverseList.length > 0) {
        const item = reverseList[0];
        const parts = [
          item.name,
          item.street,
          item.district || item.subregion,
          item.city,
          item.region,
          item.postalCode,
        ].filter(Boolean);
        readableAddress = parts.join(', ');
      }
    } catch {
      // Reverse-geocoding is non-critical fallback
      readableAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }

    return {
      success: true,
      data: {
        latitude,
        longitude,
        accuracy: typeof accuracy === 'number' ? Math.round(accuracy) : null,
        accuracyTier: evaluation.tier,
        accuracyLabel: evaluation.label,
        accuracyDescription: evaluation.description,
        timestamp: position.timestamp,
        address: readableAddress,
        isManual: false,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'An error occurred while fetching GPS coordinates.',
    };
  }
}

/**
 * Default fallback coordinates (Vidyanagar, Hubballi / Dharwad regional center)
 * Used when testing on desktop browsers with location disabled or simulators
 */
export const DEFAULT_EMERGENCY_COORDINATES: GpsLocationData = {
  latitude: 15.3585,
  longitude: 75.1305,
  accuracy: 25, // 25 meters (Good GPS)
  accuracyTier: 'good',
  accuracyLabel: 'Good GPS Estimate (±25m)',
  accuracyDescription: 'High-precision satellite lock. Optimal for emergency ambulance dispatch.',
  timestamp: Date.now(),
  address: 'Vidyanagar, PB Road, Hubballi, Karnataka 580021',
  isManual: false,
};
