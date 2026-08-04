import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapPlaceholder } from './MapPlaceholder';

interface RouteMapViewProps {
  pickupLocation: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  dropoffLocation: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  onMapReady?: () => void;
}

export const RouteMapView: React.FC<RouteMapViewProps> = ({
  pickupLocation,
  dropoffLocation,
  onMapReady,
}) => {
  return (
    <View style={styles.container}>
      <MapPlaceholder
        showRoute={true}
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
