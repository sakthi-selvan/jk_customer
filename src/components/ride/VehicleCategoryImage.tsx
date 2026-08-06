import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getVehicleImage } from '../constants/vehicleImages';

type Props = {
  type: string;
  /** Width of the thumbnail frame */
  width?: number;
  /** Height of the thumbnail frame */
  height?: number;
  style?: ViewStyle;
  /** Fallback ionicon when no asset exists */
  fallbackIcon?: string;
  fallbackColor?: string;
};

/**
 * Category product photo (studio shot on black). Falls back to an icon if missing.
 */
export function VehicleCategoryImage({
  type,
  width = 72,
  height = 52,
  style,
  fallbackIcon = 'car-outline',
  fallbackColor = '#666',
}: Props) {
  const source = getVehicleImage(type);

  if (!source) {
    return (
      <View style={[styles.wrap, { width, height, borderRadius: 12 }, style]}>
        <Ionicons name={fallbackIcon as any} size={26} color={fallbackColor} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width, height, borderRadius: 12 }, style]}>
      <Image source={source} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#0B0B0F',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
