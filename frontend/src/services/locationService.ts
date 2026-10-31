import { Capacitor } from '@capacitor/core';
import {
  Geolocation,
  type Position as NativePosition,
  type PositionOptions as NativePositionOptions,
} from '@capacitor/geolocation';

export type LocationOptions = {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
};

export type LocationWatchHandle =
  | { platform: 'web'; id: number }
  | { platform: 'native'; id: Promise<string | null> };

const permissionDeniedCode = 1;
const positionUnavailableCode = 2;
const timeoutCode = 3;

export const isLocationAvailable = (): boolean =>
  Capacitor.isNativePlatform() ||
  (typeof navigator !== 'undefined' && Boolean(navigator.geolocation));

const toNativeOptions = (options: LocationOptions = {}): NativePositionOptions => ({
  enableHighAccuracy: options.enableHighAccuracy ?? false,
  timeout: options.timeout ?? 10000,
  maximumAge: options.maximumAge ?? 0,
});

const toBrowserPosition = (position: NativePosition): GeolocationPosition => ({
  timestamp: position.timestamp,
  coords: {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude,
    altitudeAccuracy: position.coords.altitudeAccuracy,
    heading: position.coords.heading,
    speed: position.coords.speed,
  },
} as GeolocationPosition);

const toBrowserError = (error: unknown): GeolocationPositionError => {
  if (
    error &&
    typeof error === 'object' &&
    typeof (error as { code?: unknown }).code === 'number'
  ) {
    return error as GeolocationPositionError;
  }

  const message = error instanceof Error
    ? error.message
    : String((error as { message?: unknown } | null)?.message || 'Location is unavailable.');
  const normalized = message.toLowerCase();
  const code = /permission|denied|not authorized/.test(normalized)
    ? permissionDeniedCode
    : /timeout|timed out/.test(normalized)
      ? timeoutCode
      : positionUnavailableCode;

  return {
    code,
    message,
    PERMISSION_DENIED: permissionDeniedCode,
    POSITION_UNAVAILABLE: positionUnavailableCode,
    TIMEOUT: timeoutCode,
  } as GeolocationPositionError;
};

const ensureNativeLocationPermission = async (): Promise<void> => {
  const current = await Geolocation.checkPermissions();
  if (current.location === 'granted' || current.coarseLocation === 'granted') return;

  const requested = await Geolocation.requestPermissions({
    permissions: ['location'],
  });

  if (requested.location !== 'granted' && requested.coarseLocation !== 'granted') {
    throw new Error('Location permission was not granted.');
  }
};

export const getCurrentLocation = async (
  options: LocationOptions = {},
): Promise<GeolocationPosition> => {
  if (Capacitor.isNativePlatform()) {
    await ensureNativeLocationPermission();
    const position = await Geolocation.getCurrentPosition(toNativeOptions(options));
    return toBrowserPosition(position);
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('This device does not provide location services.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      options,
    );
  });
};

export const watchLocation = (
  onSuccess: (position: GeolocationPosition) => void,
  onError?: (error: GeolocationPositionError) => void,
  options: LocationOptions = {},
): LocationWatchHandle => {
  if (Capacitor.isNativePlatform()) {
    const id = (async (): Promise<string | null> => {
      try {
        await ensureNativeLocationPermission();
        return await Geolocation.watchPosition(
          toNativeOptions(options),
          (position, error) => {
            if (error) {
              onError?.(toBrowserError(error));
              return;
            }
            if (position) onSuccess(toBrowserPosition(position));
          },
        );
      } catch (error) {
        onError?.(toBrowserError(error));
        return null;
      }
    })();

    return { platform: 'native', id };
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('This device does not provide location services.');
  }

  return {
    platform: 'web',
    id: navigator.geolocation.watchPosition(onSuccess, onError, options),
  };
};

export const clearLocationWatch = async (
  handle: LocationWatchHandle,
): Promise<void> => {
  if (handle.platform === 'native') {
    const id = await handle.id;
    if (id) await Geolocation.clearWatch({ id });
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.clearWatch(handle.id);
  }
};
