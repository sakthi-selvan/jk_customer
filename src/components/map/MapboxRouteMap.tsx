import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '../../config/mapbox-config';
import { MAP_STYLES } from '../../config/mapbox-config';

// Initialize Mapbox
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface MapboxRouteMapProps {
  pickup: Coordinate;
  dropoff: Coordinate;
  driverLocation?: Coordinate;
  showRoute?: boolean;
}

export const MapboxRouteMap: React.FC<MapboxRouteMapProps> = ({
  pickup,
  dropoff,
  driverLocation,
  showRoute = true,
}) => {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<number[][]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showRoute) {
      fetchRoute();
    }
  }, [pickup, dropoff, showRoute]);

  useEffect(() => {
    // Auto-fit map to show all markers
    if (cameraRef.current) {
      const coordinates = [
        [pickup.longitude, pickup.latitude],
        [dropoff.longitude, dropoff.latitude],
      ];

      if (driverLocation) {
        coordinates.push([driverLocation.longitude, driverLocation.latitude]);
      }

      cameraRef.current.fitBounds(
        [Math.min(...coordinates.map(c => c[0])), Math.min(...coordinates.map(c => c[1]))],
        [Math.max(...coordinates.map(c => c[0])), Math.max(...coordinates.map(c => c[1]))],
        50, // padding
        1000 // animation duration
      );
    }
  }, [pickup, dropoff, driverLocation]);

  const fetchRoute = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.longitude},${pickup.latitude};${dropoff.longitude},${dropoff.latitude}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        setRouteCoordinates(data.routes[0].geometry.coordinates);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} styleURL={MAP_STYLES.STREETS}>
        <Mapbox.Camera ref={cameraRef} />

        {/* Route line */}
        {showRoute && routeCoordinates.length > 0 && (
          <Mapbox.ShapeSource
            id="routeSource"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: routeCoordinates,
              },
              properties: {},
            }}
          >
            <Mapbox.LineLayer
              id="routeLine"
              style={{
                lineColor: '#4285F4',
                lineWidth: 4,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* Pickup marker */}
        <Mapbox.PointAnnotation
          id="pickup"
          coordinate={[pickup.longitude, pickup.latitude]}
          title="Pickup"
        >
          <View style={styles.pickupMarker}>
            <View style={styles.pickupDot} />
          </View>
        </Mapbox.PointAnnotation>

        {/* Dropoff marker */}
        <Mapbox.PointAnnotation
          id="dropoff"
          coordinate={[dropoff.longitude, dropoff.latitude]}
          title="Drop-off"
        >
          <View style={styles.dropoffMarker}>
            <View style={styles.dropoffDot} />
          </View>
        </Mapbox.PointAnnotation>

        {/* Driver location marker */}
        {driverLocation && (
          <Mapbox.PointAnnotation
            id="driver"
            coordinate={[driverLocation.longitude, driverLocation.latitude]}
            title="Driver"
          >
            <View style={styles.driverMarker}>
              <View style={styles.driverDot} />
            </View>
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4285F4" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickupMarker: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00C853',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  dropoffMarker: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropoffDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF4444',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  driverMarker: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4285F4',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
