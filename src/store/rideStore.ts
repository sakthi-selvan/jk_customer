import { create } from 'zustand';
import { Ride, CreateRideData } from '../types';
import { ridesApi } from '../api/rides';
import { bookingEnhancedApi } from '../api/booking-enhanced';
import { rideRealtime } from '../services/realtime';
import { useAuthStore } from './authStore';

interface UserLocation {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
  pickType?: 'pickup' | 'dropoff';
}

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  sequence?: number | null;
  updatedAt?: string | null;
}

interface RideState {
  activeRide: Ride | null;
  rideHistory: Ride[];
  isLoading: boolean;
  error: string | null;
  driverLocation: DriverLocation | null;
  trackingInterval: ReturnType<typeof setInterval> | null;
  lastStatusAt: number;
  wsConnected: boolean;
  userLocation: UserLocation | null;
  pendingLocationPick: UserLocation | null;
  _unsubRealtime: (() => void) | null;

  setUserLocation: (loc: UserLocation) => void;
  setPendingLocationPick: (loc: UserLocation | null) => void;
  createRide: (data: CreateRideData) => Promise<Ride>;
  getActiveRide: () => Promise<void>;
  cancelRide: (rideId: string) => Promise<void>;
  loadRideHistory: () => Promise<void>;
  clearActiveRide: () => void;
  clearError: () => void;
  startTracking: () => void;
  stopTracking: () => void;
}

function isFiniteCoord(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Poll interval: faster when waiting for first driver pin, slower as fallback. */
function trackingPollMs(hasDriverPin: boolean, wsConnected: boolean): number {
  if (!hasDriverPin) return 3000;
  if (!wsConnected) return 8000;
  return 20000;
}

export const useRideStore = create<RideState>((set, get) => ({
  activeRide: null,
  rideHistory: [],
  isLoading: false,
  error: null,
  driverLocation: null,
  trackingInterval: null,
  lastStatusAt: 0,
  wsConnected: false,
  userLocation: null,
  pendingLocationPick: null,
  _unsubRealtime: null,

  setUserLocation: (loc) => set({ userLocation: loc }),
  setPendingLocationPick: (loc) => set({ pendingLocationPick: loc }),

  createRide: async (data: CreateRideData) => {
    try {
      set({ isLoading: true, error: null });
      const ride = await ridesApi.createRide(data);
      set({ activeRide: ride, isLoading: false });
      get().startTracking();
      return ride;
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to create ride';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  getActiveRide: async () => {
    try {
      set({ isLoading: true, error: null });
      const ride = await bookingEnhancedApi.getActiveRide();
      if (!ride) {
        set({ activeRide: null, isLoading: false });
        get().stopTracking();
        return;
      }
      set({ activeRide: ride as any, isLoading: false, lastStatusAt: Date.now() });
      if (['pending', 'accepted', 'started'].includes(ride.status)) {
        get().startTracking();
      }
    } catch (error: any) {
      // Network / unexpected only — no-active-ride is handled as null above
      if (error.response?.status === 404) {
        set({ activeRide: null, isLoading: false });
        get().stopTracking();
      } else {
        set({ error: 'Failed to fetch active ride', isLoading: false });
      }
    }
  },

  cancelRide: async (rideId: string) => {
    try {
      set({ isLoading: true, error: null });
      await bookingEnhancedApi.cancelRide(rideId);
      set({ activeRide: null, driverLocation: null, isLoading: false });
      get().stopTracking();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to cancel ride';
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  loadRideHistory: async () => {
    try {
      set({ isLoading: true, error: null });
      const history = await bookingEnhancedApi.getRideHistory();
      set({ rideHistory: history as any, isLoading: false });
    } catch (error: any) {
      set({ error: 'Failed to load ride history', isLoading: false });
    }
  },

  startTracking: () => {
    const { trackingInterval, activeRide, _unsubRealtime } = get();
    if (!activeRide) return;

    const token = useAuthStore.getState().accessToken;
    if (token) {
      rideRealtime.connect(token, activeRide.id);
      rideRealtime.subscribeRide(activeRide.id);
    }

    const seedDriverLocation = async () => {
      try {
        const tracking = await bookingEnhancedApi.getActiveRideTracking();
        if (isFiniteCoord(tracking.driver_lat) && isFiniteCoord(tracking.driver_lng)) {
          set({
            driverLocation: {
              latitude: tracking.driver_lat as number,
              longitude: tracking.driver_lng as number,
              heading: (tracking as any).heading ?? null,
              speed: (tracking as any).speed ?? null,
              accuracy: (tracking as any).accuracy ?? null,
              sequence: (tracking as any).sequence ?? null,
              updatedAt: (tracking as any).location_updated_at ?? null,
            },
          });
        }
        if (tracking.status && get().activeRide && tracking.status !== get().activeRide!.status) {
          const refreshed = await bookingEnhancedApi.getActiveRide();
          set({ activeRide: refreshed as any, lastStatusAt: Date.now() });
        }
      } catch {
        // ignore — WS / next poll will fill in
      }
    };

    // Always seed once so accepted/started maps have a driver pin immediately
    if (['accepted', 'started'].includes(activeRide.status)) {
      seedDriverLocation();
    }

    if (!_unsubRealtime) {
      const unsub = rideRealtime.onEvent((event, data) => {
        if (event === 'socket_open') set({ wsConnected: true });
        if (event === 'socket_close' || event === 'socket_error') set({ wsConnected: false });

        if (event === 'driver_location') {
          const lat = data.latitude ?? data.driver_lat;
          const lng = data.longitude ?? data.driver_lng;
          if (isFiniteCoord(lat) && isFiniteCoord(lng)) {
            set({
              driverLocation: {
                latitude: lat,
                longitude: lng,
                heading: data.heading ?? null,
                speed: data.speed ?? null,
                accuracy: data.accuracy ?? null,
                sequence: data.sequence ?? null,
                updatedAt: data.recorded_at ?? new Date().toISOString(),
              },
            });
          }
          if (data.status && get().activeRide) {
            set({
              activeRide: { ...(get().activeRide as any), status: data.status },
              lastStatusAt: Date.now(),
            });
          }
        }

        if (
          event === 'ride_accepted' ||
          event === 'ride_started' ||
          event === 'ride_completed' ||
          event === 'ride_cancelled' ||
          event === 'ride_reassigned' ||
          event === 'otp_verified' ||
          event === 'payment_paid'
        ) {
          const rideId = data.ride_id;
          if (rideId && get().activeRide && String(get().activeRide!.id) !== String(rideId)) return;

          if (event === 'ride_reassigned') {
            set({
              activeRide: get().activeRide
                ? ({
                    ...(get().activeRide as any),
                    status: 'pending',
                    driver_id: null,
                    driver_name: null,
                    driver_phone: null,
                    driver_vehicle_number: null,
                    driver_vehicle_type: null,
                    driver_vehicle_image: null,
                  } as any)
                : null,
              driverLocation: null,
              lastStatusAt: Date.now(),
            });
            bookingEnhancedApi.getActiveRide()
              .then((ride) => set({ activeRide: ride as any, lastStatusAt: Date.now() }))
              .catch(() => undefined);
            return;
          }

          if (event === 'ride_completed' || event === 'ride_cancelled') {
            set({
              activeRide: get().activeRide
                ? ({ ...(get().activeRide as any), status: data.status || (event === 'ride_completed' ? 'completed' : 'cancelled') } as any)
                : null,
              lastStatusAt: Date.now(),
            });
            bookingEnhancedApi.getActiveRide()
              .then((ride) => set({ activeRide: ride as any }))
              .catch(() => set({ activeRide: null, driverLocation: null }))
              .finally(() => get().stopTracking());
            return;
          }

          // Accept / start: refresh ride + immediately seed driver GPS for map path
          bookingEnhancedApi.getActiveRide()
            .then((ride) => {
              set({ activeRide: ride as any, lastStatusAt: Date.now() });
              if (event === 'ride_accepted' || event === 'ride_started') {
                seedDriverLocation();
              }
            })
            .catch(() => undefined);
        }
      });
      set({ _unsubRealtime: unsub });
    }

    // Poll tracking as fallback; also light poll while WS up so first pin isn't missed
    if (trackingInterval) return;
    const tick = async () => {
      const { activeRide: ride, wsConnected, driverLocation } = get();
      if (!ride) {
        get().stopTracking();
        return;
      }

      // With WS + pin already: skip (WS owns updates)
      if (wsConnected && driverLocation) {
        scheduleNext(true, true);
        return;
      }
      if (wsConnected && !['accepted', 'started'].includes(ride.status)) {
        scheduleNext(false, true);
        return;
      }

      try {
        const tracking = await bookingEnhancedApi.getActiveRideTracking();
        if (isFiniteCoord(tracking.driver_lat) && isFiniteCoord(tracking.driver_lng)) {
          set({
            driverLocation: {
              latitude: tracking.driver_lat as number,
              longitude: tracking.driver_lng as number,
              heading: (tracking as any).heading ?? null,
              speed: (tracking as any).speed ?? null,
              accuracy: (tracking as any).accuracy ?? null,
              sequence: (tracking as any).sequence ?? null,
              updatedAt: (tracking as any).location_updated_at ?? null,
            },
          });
        }
        if (tracking.status && tracking.status !== ride.status) {
          const refreshed = await bookingEnhancedApi.getActiveRide();
          set({ activeRide: refreshed as any, lastStatusAt: Date.now() });
          if (refreshed.status === 'completed' || refreshed.status === 'cancelled') {
            get().stopTracking();
            return;
          }
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          set({ activeRide: null, driverLocation: null });
          get().stopTracking();
          return;
        }
      }

      const state = get();
      scheduleNext(!!state.driverLocation, !!state.wsConnected);
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleNext = (hasPin: boolean, ws: boolean) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(tick, trackingPollMs(hasPin, ws));
      set({ trackingInterval: timer as any });
    };

    tick();
  },

  stopTracking: () => {
    const { trackingInterval, _unsubRealtime } = get();
    if (trackingInterval) clearTimeout(trackingInterval as any);
    if (_unsubRealtime) _unsubRealtime();
    rideRealtime.disconnect();
    set({
      trackingInterval: null,
      driverLocation: null,
      wsConnected: false,
      _unsubRealtime: null,
    });
  },

  clearActiveRide: () => {
    get().stopTracking();
    set({ activeRide: null, driverLocation: null });
  },
  clearError: () => set({ error: null }),
}));
