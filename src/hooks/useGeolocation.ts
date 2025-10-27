import { useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import type { GeoData } from '../types';

export function useGeolocation() {
  const [location, setLocation] = useState<GeoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get current location with fallback to cached location
   */
  const getCurrentLocation = async (): Promise<GeoData | null> => {
    setLoading(true);
    setError(null);

    try {
      // Request permission first
      const permission = await Geolocation.requestPermissions();

      if (permission.location !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Get current position with timeout
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      });

      const geoData: GeoData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
      };

      // Cache location for offline use
      await Preferences.set({
        key: 'lastLocation',
        value: JSON.stringify(geoData),
      });

      setLocation(geoData);
      return geoData;
    } catch (err) {
      console.error('[Geolocation] Error:', err);

      // Fallback to cached location
      try {
        const { value } = await Preferences.get({ key: 'lastLocation' });
        if (value) {
          const cachedLocation = JSON.parse(value);
          setLocation(cachedLocation);
          setError('Using cached location (GPS unavailable)');
          return cachedLocation;
        }
      } catch (cacheError) {
        console.error('[Geolocation] Cache error:', cacheError);
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Watch position for continuous updates
   */
  const watchPosition = async (callback: (geo: GeoData) => void) => {
    try {
      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
        (position, err) => {
          if (err) {
            console.error('[Geolocation] Watch error:', err);
            return;
          }

          if (position) {
            const geoData: GeoData = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date().toISOString(),
            };
            callback(geoData);
          }
        }
      );

      return watchId;
    } catch (err) {
      console.error('[Geolocation] Watch setup error:', err);
      return null;
    }
  };

  /**
   * Clear watch
   */
  const clearWatch = async (watchId: string) => {
    try {
      await Geolocation.clearWatch({ id: watchId });
    } catch (err) {
      console.error('[Geolocation] Clear watch error:', err);
    }
  };

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    watchPosition,
    clearWatch,
  };
}
