import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES, ANIMATION_DURATION } from '../../config/mapbox-config';
import { initMapbox, MAP_SURFACE_VIEW, mapboxTokenPresent } from '../../config/initMapbox';
import { FontSizes, FontWeights, BorderRadius, Spacing } from '../../constants/theme';
import { RouteProgressLayers } from './RouteProgressLayers';
import { VehicleMarker } from './VehicleMarker';
import {
  estimateRemainingMinutes,
  remainingDistanceMeters,
  splitRouteProgress,
  type LngLat,
} from '../../utils/routeProgress';

initMapbox();

interface Location {
  latitude: number;
  longitude: number;
  heading?: number | null;
}

interface RideTrackingMapProps {
  rideStatus: 'pending' | 'accepted' | 'started';
  pickupLocation: Location;
  dropoffLocation: Location | null;
  driverLocation: Location | null;
  vehicleCategory?: string;
  onEtaUpdate?: (distanceKm: number, durationMin: number) => void;
  /** Nearby captains while searching (pending). */
  nearbyPins?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    category: string;
    heading?: number | null;
  }>;
}

interface RouteData {
  coordinates: LngLat[];
  distance: number;
  duration: number;
}

function toFiniteLoc(loc: Location | null | undefined): Location | null {
  if (!loc) return null;
  const latitude = Number(loc.latitude);
  const longitude = Number(loc.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    heading: loc.heading,
  };
}

function haversineMeters(a: Location, b: Location): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function straightRoute(from: Location, to: Location): RouteData {
  const distance = haversineMeters(from, to);
  // ~25 km/h city crawl for a rough ETA while Mapbox loads
  const duration = Math.max(60, (distance / 1000 / 25) * 3600);
  return {
    coordinates: [
      [from.longitude, from.latitude],
      [to.longitude, to.latitude],
    ],
    distance,
    duration,
  };
}

/**
 * Uber / Red Taxi–style live map:
 * - pending:  pickup → drop overview while searching
 * - accepted: live driver + path driver → pickup
 * - started:  live driver + path driver → destination
 */
export const RideTrackingMap: React.FC<RideTrackingMapProps> = ({
  rideStatus,
  pickupLocation,
  dropoffLocation,
  driverLocation,
  vehicleCategory,
  onEtaUpdate,
  nearbyPins,
}) => {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [mapError, setMapError] = useState<string | null>(
    mapboxTokenPresent() ? null : 'Map token missing in this build'
  );
  const lastFetchRef = useRef<number>(0);
  const phaseRef = useRef<string>('');
  const fetchGenRef = useRef(0);
  /** True after a successful Mapbox (or fallback) fetch for the current phase. */
  const routeReadyRef = useRef(false);
  /** Frame camera once per phase (not on every GPS / sim tick). */
  const framedPhaseRef = useRef<string>('');
  /** Stable route origin for the current leg (don't rebuild from moving pin). */
  const legOriginRef = useRef<Location | null>(null);

  const pickup = useMemo(() => toFiniteLoc(pickupLocation), [
    pickupLocation.latitude,
    pickupLocation.longitude,
    pickupLocation.heading,
  ]);
  const dropoff = useMemo(() => toFiniteLoc(dropoffLocation), [
    dropoffLocation?.latitude,
    dropoffLocation?.longitude,
  ]);
  const driver = useMemo(() => toFiniteLoc(driverLocation), [
    driverLocation?.latitude,
    driverLocation?.longitude,
    driverLocation?.heading,
  ]);

  // Phase target (Uber model)
  const routeTarget: Location | null = useMemo(() => {
    if (rideStatus === 'accepted') return pickup;
    if (rideStatus === 'started' && dropoff) return dropoff;
    // pending: trip overview if dropoff exists
    if (rideStatus === 'pending' && dropoff) return dropoff;
    return null;
  }, [rideStatus, pickup, dropoff]);

  const phaseLabel =
    rideStatus === 'pending'
      ? 'Finding your captain…'
      : rideStatus === 'accepted'
        ? 'Captain arriving'
        : 'Heading to destination';

  const fetchRoute = async (from: Location, to: Location, gen: number) => {
    const apply = (next: RouteData, fromNetwork: boolean) => {
      if (gen !== fetchGenRef.current) return;
      setRouteData(next);
      lastFetchRef.current = Date.now();
      if (fromNetwork || next.coordinates.length >= 2) {
        routeReadyRef.current = true;
      }
      onEtaUpdate?.(next.distance / 1000, next.duration / 60);
    };

    if (!MAPBOX_ACCESS_TOKEN) {
      apply(straightRoute(from, to), false);
      return;
    }

    const profiles = ['driving-traffic', 'driving'] as const;
    for (const profile of profiles) {
      try {
        const url =
          `https://api.mapbox.com/directions/v5/mapbox/${profile}/` +
          `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
          `?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok || data.message || !data.routes?.[0]) continue;
        const route = data.routes[0];
        const coords = route.geometry?.coordinates as LngLat[] | undefined;
        if (!coords || coords.length < 2) continue;
        apply(
          {
            coordinates: coords,
            distance: route.distance,
            duration: route.duration,
          },
          true
        );
        return;
      } catch (error) {
        console.error(`Route fetch error (${profile}):`, error);
      }
    }

    // Always keep a visible path while searching / on failure
    apply(straightRoute(from, to), false);
  };

  // Hard reset when phase / destination changes — freeze new leg origin once
  useEffect(() => {
    const phase = `${rideStatus}:${routeTarget?.latitude},${routeTarget?.longitude}`;
    if (phaseRef.current === phase) return;

    fetchGenRef.current += 1;
    lastFetchRef.current = 0;
    framedPhaseRef.current = '';
    legOriginRef.current = null;
    routeReadyRef.current = false;
    phaseRef.current = phase;

    // Searching: draw pickup→drop immediately so the path never flashes empty
    if (rideStatus === 'pending' && pickup && routeTarget) {
      const preview = straightRoute(pickup, routeTarget);
      setRouteData(preview);
      onEtaUpdate?.(preview.distance / 1000, preview.duration / 60);
      legOriginRef.current = pickup;
    } else {
      setRouteData(null);
    }
  }, [rideStatus, routeTarget?.latitude, routeTarget?.longitude, pickup?.latitude, pickup?.longitude]);

  // Capture stable origin for accepted/started once (route polyline stays fixed while pin moves)
  useEffect(() => {
    if (rideStatus === 'pending') {
      if (pickup) legOriginRef.current = pickup;
      return;
    }
    if (legOriginRef.current) return;
    if (rideStatus === 'started' && pickup) {
      legOriginRef.current = pickup;
      return;
    }
    if (rideStatus === 'accepted' && driver) {
      legOriginRef.current = driver;
    }
  }, [rideStatus, driver?.latitude, driver?.longitude, pickup?.latitude, pickup?.longitude]);

  // Fetch road geometry once per leg (upgrade straight preview → real roads)
  useEffect(() => {
    if (!routeTarget) return;
    if (routeReadyRef.current) return;
    const gen = fetchGenRef.current;

    if (rideStatus === 'pending') {
      if (!pickup) return;
      fetchRoute(pickup, routeTarget, gen);
      return;
    }

    if (!driver || !legOriginRef.current) return;
    fetchRoute(legOriginRef.current, routeTarget, gen);
  }, [
    rideStatus,
    routeTarget?.latitude,
    routeTarget?.longitude,
    driver?.latitude,
    driver?.longitude,
    pickup?.latitude,
    pickup?.longitude,
  ]);

  const progress = useMemo(() => {
    if (!routeData || rideStatus === 'pending') return null;
    if (!driver) return null;
    return splitRouteProgress(routeData.coordinates, driver);
  }, [
    routeData,
    driver?.latitude,
    driver?.longitude,
    rideStatus,
  ]);

  // Off-route rebuild — throttled; skip tiny jitter during smooth sim
  useEffect(() => {
    if (rideStatus === 'pending') return;
    if (!progress?.offRoute || !driver || !routeTarget) return;
    if (Date.now() - lastFetchRef.current < 15000) return;
    lastFetchRef.current = Date.now();
    legOriginRef.current = driver;
    fetchRoute(driver, routeTarget, fetchGenRef.current);
  }, [progress?.offRoute, rideStatus]);

  useEffect(() => {
    if (!routeData || !progress || !onEtaUpdate) return;
    if (rideStatus === 'pending') return;
    onEtaUpdate(
      remainingDistanceMeters(progress.remaining) / 1000,
      estimateRemainingMinutes(routeData.duration / 60, progress.fraction),
    );
  }, [progress?.fraction, rideStatus]);

  // Fit camera once per phase when route (or pending endpoints) are ready — never on each move
  useEffect(() => {
    if (!cameraRef.current || !pickup) return;

    const frameKey = `${rideStatus}:${routeData ? (routeData.coordinates.length > 2 ? 'road' : 'line') : 'n'}`;
    if (framedPhaseRef.current === frameKey) return;

    // Wait for a path before framing so pickup↔drop is visible together
    if (!routeData && (rideStatus === 'accepted' || rideStatus === 'started')) return;
    if (rideStatus === 'pending' && dropoff && !routeData) return;

    const points: number[][] = [];

    if (rideStatus === 'pending') {
      points.push([pickup.longitude, pickup.latitude]);
      if (dropoff) points.push([dropoff.longitude, dropoff.latitude]);
      nearbyPins?.forEach((p) => points.push([p.longitude, p.latitude]));
    } else if (rideStatus === 'accepted') {
      if (legOriginRef.current) {
        points.push([legOriginRef.current.longitude, legOriginRef.current.latitude]);
      } else if (driver) {
        points.push([driver.longitude, driver.latitude]);
      }
      points.push([pickup.longitude, pickup.latitude]);
    } else {
      points.push([pickup.longitude, pickup.latitude]);
      if (dropoff) points.push([dropoff.longitude, dropoff.latitude]);
    }

    if (routeData?.coordinates?.length) {
      const coords = routeData.coordinates;
      points.push(coords[0], coords[Math.floor(coords.length / 2)], coords[coords.length - 1]);
    }

    if (points.length >= 2) {
      const ne = [Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))];
      const sw = [Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1]))];
      cameraRef.current.fitBounds(ne, sw, [120, 56, 280, 56], ANIMATION_DURATION);
      framedPhaseRef.current = frameKey;
    } else if (points.length === 1) {
      cameraRef.current.setCamera({
        centerCoordinate: points[0],
        zoomLevel: 15,
        animationDuration: ANIMATION_DURATION,
      });
      framedPhaseRef.current = frameKey;
    }
  }, [
    rideStatus,
    routeData,
    pickup?.latitude,
    pickup?.longitude,
    dropoff?.latitude,
    dropoff?.longitude,
    nearbyPins?.length,
  ]);

  const tripPath =
    routeData?.coordinates && routeData.coordinates.length >= 2
      ? routeData.coordinates
      : null;

  const travelled =
    progress && progress.travelled.length >= 2 ? progress.travelled : null;
  const remaining =
    progress && progress.remaining.length >= 2
      ? progress.remaining
      : tripPath;

  const etaDistanceM = progress
    ? remainingDistanceMeters(progress.remaining)
    : routeData?.distance || 0;
  const etaDurationS = progress && routeData
    ? estimateRemainingMinutes(routeData.duration / 60, progress.fraction) * 60
    : routeData?.duration || 0;

  const showPickup = rideStatus !== 'started' && !!pickup;
  const showDropoff = !!dropoff && rideStatus !== 'accepted';
  // During accepted, still hint destination lightly
  const showDropoffHint = !!dropoff && rideStatus === 'accepted';

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={MAP_STYLES.STREETS}
        compassEnabled
        attributionEnabled={true}
        logoEnabled={true}
        surfaceView={MAP_SURFACE_VIEW}
        onDidFailLoadingMap={() =>
          setMapError('Map failed to load. Check network or reinstall the latest preview.')
        }
      >
        <Mapbox.Camera ref={cameraRef} animationDuration={ANIMATION_DURATION} />
        <Mapbox.UserLocation visible showsUserHeadingIndicator />

        {/* Only draw live progress for accepted/started */}
        {(rideStatus === 'accepted' || rideStatus === 'started') && (
          <RouteProgressLayers
            travelled={travelled}
            remaining={remaining}
            idPrefix={`ride-${rideStatus}`}
          />
        )}

        {/* Pending: always draw pickup → drop path (road or straight fallback) */}
        {rideStatus === 'pending' && tripPath && (
          <RouteProgressLayers
            travelled={null}
            remaining={tripPath}
            idPrefix="ride-pending"
          />
        )}

        {showPickup && pickup && (
          <Mapbox.PointAnnotation
            id="pickup"
            coordinate={[pickup.longitude, pickup.latitude]}
            title="Pickup"
          >
            <View style={[styles.marker, styles.pickupMarker]}>
              <Text style={styles.markerText}>P</Text>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {showDropoff && dropoff && (
          <Mapbox.PointAnnotation
            id="dropoff"
            coordinate={[dropoff.longitude, dropoff.latitude]}
            title="Dropoff"
          >
            <View style={[styles.marker, styles.dropoffMarker]}>
              <Text style={styles.markerText}>D</Text>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {showDropoffHint && dropoff && (
          <Mapbox.PointAnnotation
            id="dropoff-hint"
            coordinate={[dropoff.longitude, dropoff.latitude]}
            title="Destination"
          >
            <View style={[styles.marker, styles.dropoffHint]}>
              <Text style={styles.markerText}>D</Text>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Stable key — coordinate-based keys remount MarkerView every tick and blink */}
        {driver && (rideStatus === 'accepted' || rideStatus === 'started') && (
          <Mapbox.MarkerView
            key="driver-marker"
            id="driver"
            coordinate={[driver.longitude, driver.latitude]}
            allowOverlap
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <VehicleMarker
              category={vehicleCategory || 'mini'}
              size={38}
              heading={driver.heading}
            />
          </Mapbox.MarkerView>
        )}

        {rideStatus === 'pending' &&
          nearbyPins?.map((pin) => (
            <Mapbox.MarkerView
              key={pin.id}
              id={pin.id}
              coordinate={[pin.longitude, pin.latitude]}
              allowOverlap
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <VehicleMarker category={pin.category} size={32} heading={pin.heading} />
            </Mapbox.MarkerView>
          ))}
      </Mapbox.MapView>

      {mapError ? (
        <View style={styles.mapError} pointerEvents="none">
          <Ionicons name="map-outline" size={28} color="#64748B" />
          <Text style={styles.mapErrorText}>{mapError}</Text>
        </View>
      ) : null}

      <View style={styles.phaseBanner}>
        <Text style={styles.phaseText}>{phaseLabel}</Text>
      </View>

      {routeData && (
        <View style={styles.etaOverlay}>
          <Ionicons name="time-outline" size={14} color="#1A73E8" />
          <Text style={styles.etaTime}>{Math.max(1, Math.ceil(etaDurationS / 60))} min</Text>
          <View style={styles.etaDivider} />
          <Ionicons name="navigate-outline" size={14} color="#666" />
          <Text style={styles.etaDist}>{(etaDistanceM / 1000).toFixed(1)} km</Text>
          <Text style={styles.etaHint}>
            {rideStatus === 'accepted' ? 'to pickup' : rideStatus === 'pending' ? 'trip' : 'to dropoff'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  mapError: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 24,
    gap: 8,
  },
  mapErrorText: {
    textAlign: 'center',
    color: '#475569',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  marker: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  pickupMarker: { backgroundColor: '#0F9D58' },
  dropoffMarker: { backgroundColor: '#EA4335' },
  dropoffHint: { backgroundColor: '#EA4335', opacity: 0.55, transform: [{ scale: 0.85 }] },
  markerText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  driverMarker: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1A73E8',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 6,
  },
  phaseBanner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.88)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  phaseText: {
    color: '#FFF',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  etaOverlay: {
    position: 'absolute', bottom: 16, left: Spacing.md,
    backgroundColor: '#FFF', borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  etaDivider: { width: 1, height: 14, backgroundColor: '#E0E0E0' },
  etaTime: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: '#1A73E8' },
  etaDist: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, color: '#666' },
  etaHint: { fontSize: FontSizes.xs, color: '#94A3B8', marginLeft: 2 },
});
