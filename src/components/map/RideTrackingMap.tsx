import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES, ANIMATION_DURATION } from '../../config/mapbox-config';
import { FontSizes, FontWeights, BorderRadius, Spacing } from '../../constants/theme';
import { RouteProgressLayers } from './RouteProgressLayers';
import { VehicleMarker } from './VehicleMarker';
import {
  estimateRemainingMinutes,
  remainingDistanceMeters,
  splitRouteProgress,
  type LngLat,
} from '../../utils/routeProgress';

try {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
} catch (error) {
  console.error('Failed to set Mapbox token in RideTrackingMap:', error);
}

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
  /** Optional nearby captain pins (UI preview / searching). */
  nearbyPins?: Array<{ id: string; latitude: number; longitude: number; category: string }>;
}

interface RouteData {
  coordinates: LngLat[];
  distance: number;
  duration: number;
}

/**
 * Uber / Red Taxi–style live map:
 * - pending:  pickup focus while searching
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
  const lastFetchRef = useRef<number>(0);
  const phaseRef = useRef<string>('');
  const fetchingRef = useRef(false);

  // Phase target (Uber model)
  const routeTarget: Location | null = useMemo(() => {
    if (rideStatus === 'accepted') return pickupLocation;
    if (rideStatus === 'started' && dropoffLocation) return dropoffLocation;
    // pending: preview trip if dropoff exists
    if (rideStatus === 'pending' && dropoffLocation) return dropoffLocation;
    return null;
  }, [
    rideStatus,
    pickupLocation.latitude,
    pickupLocation.longitude,
    dropoffLocation?.latitude,
    dropoffLocation?.longitude,
  ]);

  const routeOrigin: Location | null = useMemo(() => {
    if (rideStatus === 'pending') return pickupLocation;
    if (driverLocation) return driverLocation;
    return null;
  }, [
    rideStatus,
    driverLocation?.latitude,
    driverLocation?.longitude,
    pickupLocation.latitude,
    pickupLocation.longitude,
  ]);

  const phaseLabel =
    rideStatus === 'pending'
      ? 'Finding your captain…'
      : rideStatus === 'accepted'
        ? 'Captain arriving'
        : 'Heading to destination';

  const fetchRoute = async (from: Location, to: Location) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || data.message || !data.routes?.[0]) return;

      const route = data.routes[0];
      setRouteData({
        coordinates: route.geometry.coordinates as LngLat[],
        distance: route.distance,
        duration: route.duration,
      });
      lastFetchRef.current = Date.now();
      onEtaUpdate?.(route.distance / 1000, route.duration / 60);
    } catch (error) {
      console.error('Route fetch error:', error);
    } finally {
      fetchingRef.current = false;
    }
  };

  // Hard reset route when phase changes (accepted ↔ started)
  useEffect(() => {
    const phase = `${rideStatus}:${routeTarget?.latitude},${routeTarget?.longitude}`;
    if (phaseRef.current && phaseRef.current !== phase) {
      setRouteData(null);
      lastFetchRef.current = 0;
    }
    phaseRef.current = phase;
  }, [rideStatus, routeTarget?.latitude, routeTarget?.longitude]);

  // Fetch / refresh route for current phase
  useEffect(() => {
    if (!routeOrigin || !routeTarget) return;

    // For live legs, wait until we have a driver pin
    if ((rideStatus === 'accepted' || rideStatus === 'started') && !driverLocation) {
      return;
    }

    const shouldFetch =
      !routeData ||
      Date.now() - lastFetchRef.current > 40000;

    if (shouldFetch) {
      fetchRoute(routeOrigin, routeTarget);
    }
  }, [
    rideStatus,
    routeTarget?.latitude,
    routeTarget?.longitude,
    driverLocation?.latitude,
    driverLocation?.longitude,
    routeData,
  ]);

  const progress = useMemo(() => {
    if (!routeData || !driverLocation) return null;
    if (rideStatus === 'pending') return null;
    return splitRouteProgress(routeData.coordinates, driverLocation);
  }, [
    routeData,
    driverLocation?.latitude,
    driverLocation?.longitude,
    rideStatus,
  ]);

  // Off-route → rebuild remaining path from live driver position
  useEffect(() => {
    if (rideStatus === 'pending') return;
    if (!progress?.offRoute || !driverLocation || !routeTarget) return;
    if (Date.now() - lastFetchRef.current < 8000) return;
    lastFetchRef.current = Date.now();
    fetchRoute(driverLocation, routeTarget);
  }, [progress?.offRoute, driverLocation?.latitude, driverLocation?.longitude, rideStatus]);

  useEffect(() => {
    if (!routeData || !progress || !onEtaUpdate) return;
    if (rideStatus === 'pending') return;
    onEtaUpdate(
      remainingDistanceMeters(progress.remaining) / 1000,
      estimateRemainingMinutes(routeData.duration / 60, progress.fraction),
    );
  }, [progress?.fraction, rideStatus]);

  // Fit camera to the active phase
  useEffect(() => {
    if (!cameraRef.current) return;
    const points: number[][] = [];

    if (rideStatus === 'pending') {
      points.push([pickupLocation.longitude, pickupLocation.latitude]);
      if (dropoffLocation) {
        points.push([dropoffLocation.longitude, dropoffLocation.latitude]);
      }
    } else if (rideStatus === 'accepted') {
      if (driverLocation) points.push([driverLocation.longitude, driverLocation.latitude]);
      points.push([pickupLocation.longitude, pickupLocation.latitude]);
    } else {
      if (driverLocation) points.push([driverLocation.longitude, driverLocation.latitude]);
      if (dropoffLocation) {
        points.push([dropoffLocation.longitude, dropoffLocation.latitude]);
      }
    }

    if (routeData?.coordinates?.length) {
      const mid = routeData.coordinates[Math.floor(routeData.coordinates.length / 2)];
      points.push(routeData.coordinates[0], mid, routeData.coordinates[routeData.coordinates.length - 1]);
    }

    if (points.length >= 2) {
      const ne = [Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))];
      const sw = [Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1]))];
      cameraRef.current.fitBounds(ne, sw, [120, 56, 280, 56], ANIMATION_DURATION);
    } else if (points.length === 1 && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: points[0],
        zoomLevel: 15,
        animationDuration: ANIMATION_DURATION,
      });
    }
  }, [
    rideStatus,
    routeData,
    driverLocation?.latitude,
    driverLocation?.longitude,
    pickupLocation.latitude,
    dropoffLocation?.latitude,
  ]);

  const travelled =
    progress && progress.travelled.length >= 2 ? progress.travelled : null;
  const remaining =
    progress && progress.remaining.length >= 2
      ? progress.remaining
      : routeData?.coordinates || null;

  const etaDistanceM = progress
    ? remainingDistanceMeters(progress.remaining)
    : routeData?.distance || 0;
  const etaDurationS = progress && routeData
    ? estimateRemainingMinutes(routeData.duration / 60, progress.fraction) * 60
    : routeData?.duration || 0;

  const showPickup = rideStatus !== 'started';
  const showDropoff = !!dropoffLocation && rideStatus !== 'accepted';
  // During accepted, still hint destination lightly
  const showDropoffHint = !!dropoffLocation && rideStatus === 'accepted';

  const driverKey = driverLocation
    ? `drv-${driverLocation.latitude.toFixed(5)}-${driverLocation.longitude.toFixed(5)}`
    : 'drv-none';

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={MAP_STYLES.STREETS}
        compassEnabled
        attributionEnabled={true}
        logoEnabled={true}
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

        {/* Pending: simple preview line (no progress split) */}
        {rideStatus === 'pending' && remaining && remaining.length >= 2 && (
          <RouteProgressLayers
            travelled={null}
            remaining={remaining}
            idPrefix="ride-pending"
          />
        )}

        {showPickup && (
          <Mapbox.PointAnnotation
            id="pickup"
            coordinate={[pickupLocation.longitude, pickupLocation.latitude]}
            title="Pickup"
          >
            <View style={[styles.marker, styles.pickupMarker]}>
              <Text style={styles.markerText}>P</Text>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {showDropoff && dropoffLocation && (
          <Mapbox.PointAnnotation
            id="dropoff"
            coordinate={[dropoffLocation.longitude, dropoffLocation.latitude]}
            title="Dropoff"
          >
            <View style={[styles.marker, styles.dropoffMarker]}>
              <Text style={styles.markerText}>D</Text>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {showDropoffHint && dropoffLocation && (
          <Mapbox.PointAnnotation
            id="dropoff-hint"
            coordinate={[dropoffLocation.longitude, dropoffLocation.latitude]}
            title="Destination"
          >
            <View style={[styles.marker, styles.dropoffHint]}>
              <Text style={styles.markerText}>D</Text>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {driverLocation && (rideStatus === 'accepted' || rideStatus === 'started') && (
          <Mapbox.PointAnnotation
            key={driverKey}
            id="driver"
            coordinate={[driverLocation.longitude, driverLocation.latitude]}
            title="Captain"
          >
            <VehicleMarker
              category={vehicleCategory || 'mini'}
              size={48}
              heading={driverLocation.heading}
            />
          </Mapbox.PointAnnotation>
        )}

        {rideStatus === 'pending' &&
          nearbyPins?.map((pin) => (
            <Mapbox.PointAnnotation
              key={pin.id}
              id={pin.id}
              coordinate={[pin.longitude, pin.latitude]}
              title={pin.category}
            >
              <VehicleMarker category={pin.category} size={40} />
            </Mapbox.PointAnnotation>
          ))}
      </Mapbox.MapView>

      <View style={styles.phaseBanner}>
        <Text style={styles.phaseText}>{phaseLabel}</Text>
      </View>

      {routeData && (rideStatus === 'accepted' || rideStatus === 'started') && (
        <View style={styles.etaOverlay}>
          <Ionicons name="time-outline" size={14} color="#1A73E8" />
          <Text style={styles.etaTime}>{Math.max(1, Math.ceil(etaDurationS / 60))} min</Text>
          <View style={styles.etaDivider} />
          <Ionicons name="navigate-outline" size={14} color="#666" />
          <Text style={styles.etaDist}>{(etaDistanceM / 1000).toFixed(1)} km</Text>
          <Text style={styles.etaHint}>
            {rideStatus === 'accepted' ? 'to pickup' : 'to dropoff'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
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
