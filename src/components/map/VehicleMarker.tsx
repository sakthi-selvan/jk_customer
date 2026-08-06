/**
 * Top-down vehicle markers for the map (Google Maps / Uber style).
 */
import React from 'react';
import { View, Text, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type FleetCategory = 'all' | 'bike' | 'auto' | 'mini' | 'sedan' | 'suv' | 'other';

const TOP_VIEW: Record<string, ImageSourcePropType> = {
  bike: require('../../../assets/map_markers/bike.png'),
  auto: require('../../../assets/map_markers/auto.png'),
  mini: require('../../../assets/map_markers/mini.png'),
  sedan: require('../../../assets/map_markers/sedan.png'),
  suv: require('../../../assets/map_markers/suv.png'),
  other: require('../../../assets/map_markers/mini.png'),
};

export const FLEET_FILTERS: Array<{
  id: FleetCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}> = [
  { id: 'all', label: 'All', icon: 'apps', color: '#64748B' },
  { id: 'bike', label: 'Bike', icon: 'bicycle', color: '#F97316' },
  { id: 'auto', label: 'Auto', icon: 'bus', color: '#EAB308' },
  { id: 'mini', label: 'Mini', icon: 'car-outline', color: '#22C55E' },
  { id: 'sedan', label: 'Sedan', icon: 'car-sport-outline', color: '#3B82F6' },
  { id: 'suv', label: 'SUV', icon: 'car', color: '#F59E0B' },
];

const STYLE: Record<string, { label: string; color: string }> = {
  bike: { label: 'Bike', color: '#F97316' },
  auto: { label: 'Auto', color: '#EAB308' },
  mini: { label: 'Mini', color: '#22C55E' },
  sedan: { label: 'Sedan', color: '#3B82F6' },
  suv: { label: 'SUV', color: '#F59E0B' },
  other: { label: 'Other', color: '#64748B' },
};

/** Map driver.vehicle_type string → fleet category */
export function normalizeFleetCategory(vehicleType?: string | null): FleetCategory {
  const t = (vehicleType || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (!t) return 'other';
  if (/(bike|motor|scooter|2wheel|two_wheel)/.test(t)) return 'bike';
  if (/(auto|rickshaw|3wheel|three_wheel)/.test(t)) return 'auto';
  if (/(suv|muv|xl|innova|ertiga|premium|luxury|crysta|byd)/.test(t)) return 'suv';
  if (/(sedan|dzire|etios)/.test(t)) return 'sedan';
  if (/(mini|hatch|wagon|alto|compact)/.test(t)) return 'mini';
  if (t.includes('car')) return 'mini';
  return 'other';
}

interface VehicleMarkerProps {
  category: FleetCategory | string;
  size?: number;
  /** Degrees clockwise from north (0 = facing up on map). */
  heading?: number | null;
}

export const VehicleMarker: React.FC<VehicleMarkerProps> = ({
  category,
  size = 44,
  heading = null,
}) => {
  const key = (TOP_VIEW[category] ? category : normalizeFleetCategory(category)) as string;
  const source = TOP_VIEW[key] || TOP_VIEW.other;
  const rotation = typeof heading === 'number' && Number.isFinite(heading) ? heading : 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          transform: [{ rotate: `${rotation}deg` }],
        },
      ]}
    >
      <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  );
};

export const VehicleMarkerLegend: React.FC<{ category: FleetCategory }> = ({ category }) => {
  const cfg = STYLE[category] || STYLE.other;
  return (
    <View style={styles.legendRow}>
      <VehicleMarker category={category} size={28} />
      <Text style={styles.legendText}>{cfg.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 12, color: '#334155', textTransform: 'capitalize' },
});
