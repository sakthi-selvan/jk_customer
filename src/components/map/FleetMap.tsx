import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Mapbox, { Camera, MapView, UserLocation } from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES } from '../../config/mapbox-config';
import { bookingEnhancedApi } from '../../api/booking-enhanced';
import {
  FLEET_FILTERS,
  FleetCategory,
  VehicleMarker,
  normalizeFleetCategory,
} from './VehicleMarker';
import { FontSizes, FontWeights, Spacing } from '../../constants/theme';

try {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
} catch {
  // token set elsewhere
}

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
}) => {
  const cameraRef = useRef<Camera>(null);
  const [localFilter, setLocalFilter] = useState<FleetCategory>('all');
  const [drivers, setDrivers] = useState<NearbyDriverPin[]>([]);
  const filter = controlledFilter ?? localFilter;

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
      <MapView
        style={styles.map}
        styleURL={MAP_STYLES.STREETS}
        compassEnabled={false}
        scaleBarEnabled={false}
        attributionEnabled
        logoEnabled={false}
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
          <Mapbox.PointAnnotation
            key={`${d.id}-${d.category}`}
            id={`fleet-${d.id}`}
            coordinate={[d.longitude, d.latitude]}
            title={d.category}
          >
            <VehicleMarker category={d.category} size={34} />
          </Mapbox.PointAnnotation>
        ))}
      </MapView>

      {showFilterChips && (
        <View style={styles.chipBar}>
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
  chipBar: {
    position: 'absolute',
    top: 8,
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
