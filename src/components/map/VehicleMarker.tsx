/**
 * Distinct map markers per vehicle category (bike / auto / car types).
 * Avoids a single generic car placeholder for all fleets.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type FleetCategory = 'all' | 'bike' | 'auto' | 'mini' | 'sedan' | 'suv' | 'premium' | 'other';

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
  { id: 'premium', label: 'Premium', icon: 'diamond', color: '#8B5CF6' },
];

const STYLE: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; bg: string; label: string; shape: 'circle' | 'rounded' | 'pill' }
> = {
  bike: { icon: 'bicycle', bg: '#F97316', label: 'B', shape: 'pill' },
  auto: { icon: 'bus', bg: '#EAB308', label: 'A', shape: 'rounded' },
  mini: { icon: 'car-outline', bg: '#22C55E', label: 'M', shape: 'circle' },
  sedan: { icon: 'car-sport-outline', bg: '#3B82F6', label: 'S', shape: 'circle' },
  suv: { icon: 'car', bg: '#F59E0B', label: 'V', shape: 'circle' },
  premium: { icon: 'diamond', bg: '#8B5CF6', label: 'P', shape: 'circle' },
  other: { icon: 'car', bg: '#64748B', label: '?', shape: 'circle' },
};

/** Map driver.vehicle_type string → fleet category */
export function normalizeFleetCategory(vehicleType?: string | null): FleetCategory {
  const t = (vehicleType || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (!t) return 'other';
  if (/(bike|motor|scooter|2wheel|two_wheel)/.test(t)) return 'bike';
  if (/(auto|rickshaw|3wheel|three_wheel)/.test(t)) return 'auto';
  if (/(premium|luxury|crysta|byd)/.test(t)) return 'premium';
  if (/(suv|muv|xl|innova|ertiga)/.test(t)) return 'suv';
  if (/(sedan|dzire|etios)/.test(t)) return 'sedan';
  if (/(mini|hatch|wagon|alto|compact)/.test(t)) return 'mini';
  if (t.includes('car')) return 'mini';
  return 'other';
}

interface VehicleMarkerProps {
  category: FleetCategory | string;
  size?: number;
}

export const VehicleMarker: React.FC<VehicleMarkerProps> = ({ category, size = 36 }) => {
  const key = (STYLE[category] ? category : normalizeFleetCategory(category)) as string;
  const cfg = STYLE[key] || STYLE.other;
  const radius =
    cfg.shape === 'pill' ? size / 2.5 : cfg.shape === 'rounded' ? 8 : size / 2;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: cfg.bg,
        },
      ]}
    >
      <Ionicons name={cfg.icon} size={size * 0.5} color="#FFF" />
    </View>
  );
};

export const VehicleMarkerLegend: React.FC<{ category: FleetCategory }> = ({ category }) => {
  const cfg = STYLE[category] || STYLE.other;
  return (
    <View style={styles.legendRow}>
      <VehicleMarker category={category} size={22} />
      <Text style={styles.legendText}>{cfg.label === '?' ? 'Other' : category}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 12, color: '#334155', textTransform: 'capitalize' },
});
