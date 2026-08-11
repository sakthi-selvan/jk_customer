import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Mapbox, { Camera, MapView, UserLocation, MarkerView } from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { MAP_STYLES } from '../../config/mapbox-config';
import { initMapbox, MAP_SURFACE_VIEW, mapboxTokenPresent } from '../../config/initMapbox';
import { bookingEnhancedApi } from '../../api/booking-enhanced';
import {
  FLEET_FILTERS,
  FleetCategory,
  VehicleMarker,
  normalizeFleetCategory,
} from './VehicleMarker';
import { FontSizes, FontWeights, Spacing } from '../../constants/theme';

initMapbox();

export interface NearbyDriverPin {
  id: string;
  latitude: number;
  longitude: number;
  vehicle_type: string;
  category: FleetCategory;
}

interface FleetMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  /** Controlled filter from parent; if omitted, chips manage local state */
  vehicleFilter?: FleetCategory;
  onVehicleFilterChange?: (filter: FleetCategory) => void;
  womenOnly?: boolean;
  showFilterChips?: boolean;
  /** Distance from top of map to filter chips (avoids overlapping header UI) */
  chipBarTop?: number;
}

/**
 * Home / idle map with nearby fleet pins.
 * Default = all types; selecting Bike/Auto/Mini/… shows only that type.
 */
export const FleetMap: React.FC<FleetMapProps> = ({
  latitude,
  longitude,
  zoom = 14,
  vehicleFilter: controlledFilter,
  onVehicleFilterChange,
  womenOnly = false,
  showFilterChips = true,
  chipBarTop = 8,
}) => {
  const cameraRef = useRef<Camera>(null);
  const [localFilter, setLocalFilter] = useState<FleetCategory>('all');
  const [drivers, setDrivers] = useState<NearbyDriverPin[]>([]);
  const [mapError, setMapError] = useState<string | null>(
    mapboxTokenPresent() ? null : 'Loading map…'
  );
  const [mapReady, setMapReady] = useState(mapboxTokenPresent());
  const filter = controlledFilter ?? localFilter;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (mapboxTokenPresent()) {
        initMapbox();
        if (!cancelled) setMapReady(true);
        return;
      }
      try {
        const { ensureMapboxTokenAfterAuth } = await import('../../services/mapboxAuth');
        const ok = await ensureMapboxTokenAfterAuth();
        if (cancelled) return;
        if (ok) {
          setMapReady(true);
          setMapError(null);
        } else {
          setMapError('Map is unavailable. Check connection and try again.');
        }
      } catch {
        if (!cancelled) setMapError('Map is unavailable. Check connection and try again.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setFilter = (next: FleetCategory) => {
    if (onVehicleFilterChange) onVehicleFilterChange(next);
    else setLocalFilter(next);
  };

  const loadDrivers = useCallback(async () => {
    try {
      const res = await bookingEnhancedApi.getNearbyDriversLocations(latitude, longitude, {
        vehicle_category: filter === 'all' ? undefined : filter,
        women_only: womenOnly || undefined,
      });
      const pins: NearbyDriverPin[] = (res.drivers || []).map((d) => ({
        id: d.id,
        latitude: d.latitude,
        longitude: d.longitude,
        vehicle_type: d.vehicle_type || '',
        category: (d as any).category || normalizeFleetCategory(d.vehicle_type),
      }));
      setDrivers(pins);
    } catch (e) {
      console.log('[FleetMap] nearby load failed', e);
    }
  }, [latitude, longitude, filter, womenOnly]);

  useEffect(() => {
    loadDrivers();
    const t = setInterval(loadDrivers, 12000);
    return () => clearInterval(t);
  }, [loadDrivers]);

  useEffect(() => {
    cameraRef.current?.setCamera({
      centerCoordinate: [longitude, latitude],
      zoomLevel: zoom,
      animationDuration: 800,
    });
  }, [latitude, longitude, zoom]);

  return (
    <View style={styles.container}>
      {mapReady ? (
      <MapView
        style={styles.map}
        styleURL={MAP_STYLES.STREETS}
        compassEnabled={false}
        scaleBarEnabled={false}
        attributionEnabled
        logoEnabled={false}
        surfaceView={MAP_SURFACE_VIEW}
        onDidFailLoadingMap={() =>
          setMapError('Map failed to load. Check network or reinstall the latest preview.')
        }
      >
        <Camera
          ref={cameraRef}
          zoomLevel={zoom}
          centerCoordinate={[longitude, latitude]}
          animationMode="flyTo"
          animationDuration={800}
        />
        <UserLocation visible showsUserHeadingIndicator androidRenderMode="compass" />

        {drivers.map((d) => (
          <MarkerView
            key={`${d.id}-${d.category}`}
            id={`fleet-${d.id}`}
            coordinate={[d.longitude, d.latitude]}
            allowOverlap
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <VehicleMarker category={d.category} size={34} />
          </MarkerView>
        ))}
      </MapView>
      ) : (
        <View style={[styles.map, styles.mapError]}>
          <Ionicons name="map-outline" size={28} color="#64748B" />
          <Text style={styles.mapErrorText}>{mapError || 'Loading map…'}</Text>
        </View>
      )}

      {mapError && mapReady ? (
        <View style={styles.mapError} pointerEvents="none">
          <Ionicons name="map-outline" size={28} color="#64748B" />
          <Text style={styles.mapErrorText}>{mapError}</Text>
        </View>
      ) : null}

      {showFilterChips && (
        <View style={[styles.chipBar, { top: chipBarTop }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {FLEET_FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.chip, active && { backgroundColor: f.color, borderColor: f.color }]}
                  onPress={() => setFilter(f.id)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={f.icon} size={14} color={active ? '#FFF' : f.color} />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.countHint}>
            {drivers.length} nearby{filter !== 'all' ? ` · ${filter}` : ''}
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
  chipBar: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  chipRow: {
    paddingHorizontal: Spacing.md,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  chipText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, color: '#334155' },
  chipTextActive: { color: '#FFF' },
  countHint: {
    marginTop: 6,
    marginLeft: Spacing.md,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
});
