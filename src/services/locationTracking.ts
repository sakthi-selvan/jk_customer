import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TRACKING = 'background-location-tracking';

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

let locationCallback: ((location: LocationUpdate) => void) | null = null;

// Define the background task
TaskManager.defineTask(LOCATION_TRACKING, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data as any;
    const location = locations[0];

    if (location && locationCallback) {
      const update: LocationUpdate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      locationCallback(update);
    }
  }
});

export class LocationTrackingService {
  private static instance: LocationTrackingService;
  private isTracking = false;

  private constructor() {}

  static getInstance(): LocationTrackingService {
    if (!LocationTrackingService.instance) {
      LocationTrackingService.instance = new LocationTrackingService();
    }
    return LocationTrackingService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission denied');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

      if (backgroundStatus !== 'granted') {
        console.log('Background location permission denied');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  async startTracking(callback: (location: LocationUpdate) => void): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();

      if (!hasPermission) {
        return false;
      }

      locationCallback = callback;

      await Location.startLocationUpdatesAsync(LOCATION_TRACKING, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Or every 10 meters
        foregroundService: {
          notificationTitle: 'JK Taxi - Active Ride',
          notificationBody: 'Tracking your location for ride updates',
          notificationColor: '#FFEB3B',
        },
      });

      this.isTracking = true;
      console.log('Background location tracking started');
      return true;
    } catch (error) {
      console.error('Error starting background location tracking:', error);
      return false;
    }
  }

  async stopTracking(): Promise<void> {
    try {
      const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TRACKING);

      if (isTaskDefined) {
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING);
      }

      locationCallback = null;
      this.isTracking = false;
      console.log('Background location tracking stopped');
    } catch (error) {
      console.error('Error stopping background location tracking:', error);
    }
  }

  async getCurrentLocation(): Promise<LocationUpdate | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  isTrackingActive(): boolean {
    return this.isTracking;
  }

  async checkPermissionStatus(): Promise<{
    foreground: boolean;
    background: boolean;
  }> {
    try {
      const foreground = await Location.getForegroundPermissionsAsync();
      const background = await Location.getBackgroundPermissionsAsync();

      return {
        foreground: foreground.status === 'granted',
        background: background.status === 'granted',
      };
    } catch (error) {
      console.error('Error checking permission status:', error);
      return { foreground: false, background: false };
    }
  }
}

export const locationTrackingService = LocationTrackingService.getInstance();
