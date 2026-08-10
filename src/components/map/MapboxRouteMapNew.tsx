import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES, MAP_PADDING, ANIMATION_DURATION } from '../../config/mapbox-config';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';

try {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
} catch (error) {
  console.error('Failed to set Mapbox token in MapboxRouteMapNew:', error);
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface MapboxRouteMapNewProps {
  pickup: Location;
  dropoff: Location;
  onRouteReady?: (distance: number, duration: number) => void;
  showRouteInfo?: boolean;
}

interface RouteData {
  coordinates: number[][];
  distance: number;
  duration: number;
  congestion?: any;
}

/**
 * MapboxRouteMapNew - Displays route between pickup and dropoff using Mapbox Directions API
 * Shows route polyline, markers, and estimated distance/duration
 */
export const MapboxRouteMapNew: React.FC<MapboxRouteMapNewProps> = ({
  pickup,
  dropoff,
  onRouteReady,
  showRouteInfo = true,
}) => {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);

  useEffect(() => {
    fetchRoute();
  }, [pickup, dropoff]);

  useEffect(() => {
    if (routeData && cameraRef.current) {
      // Fit map to show entire route
      const coordinates = routeData.coordinates;
      const bounds = {
        ne: [
          Math.max(...coordinates.map(c => c[0])),
          Math.max(...coordinates.map(c => c[1])),
        ],
        sw: [
          Math.min(...coordinates.map(c => c[0])),
          Math.min(...coordinates.map(c => c[1])),
        ],
      };

      cameraRef.current.fitBounds(bounds.ne, bounds.sw, MAP_PADDING, ANIMATION_DURATION);
    }
  }, [routeData]);

  const fetchRoute = async () => {
    try {
      // Use driving-traffic with congestion annotations (like Navigation SDK RouteOptions)
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
        `${pickup.longitude},${pickup.latitude};${dropoff.longitude},${dropoff.latitude}` +
        `?geometries=geojson&overview=full&steps=true` +
        `&annotations=congestion_numeric,distance,duration` +
        `&access_token=${MAPBOX_ACCESS_TOKEN}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.message) {
        console.error('Mapbox Route API Error:', data.message);
        return;
      }

      if (!response.ok) return;

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates;

        // Build congestion-colored segments
        let congestionGeoJSON = null;
        if (route.legs?.[0]?.annotation?.congestion_numeric) {
          const congestion = route.legs[0].annotation.congestion_numeric;
          const features: any[] = [];
          for (let i = 0; i < congestion.length && i < coordinates.length - 1; i++) {
            const level = congestion[i];
            let color = '#4CAF50';
            if (level >= 80) color = '#D32F2F';
            else if (level >= 60) color = '#F57C00';
            else if (level >= 40) color = '#FDD835';
            features.push({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: [coordinates[i], coordinates[i + 1]] },
              properties: { color, congestion: level },
            });
          }
          congestionGeoJSON = { type: 'FeatureCollection', features };
        }

        setRouteData({
          coordinates,
          distance: route.distance,
          duration: route.duration,
          congestion: congestionGeoJSON,
        });

        if (onRouteReady) {
          onRouteReady(route.distance / 1000, route.duration / 60);
        }
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const routeGeoJSON = routeData
    ? {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: routeData.coordinates,
        },
        properties: {},
      }
    : null;

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/navigation-day-v1"
        surfaceView={false}
        compassEnabled
        attributionEnabled={true}
        logoEnabled={true}
      >
        <Mapbox.Camera
          ref={cameraRef}
          animationDuration={ANIMATION_DURATION}
        />

        <Mapbox.UserLocation visible showsUserHeadingIndicator />

        {/* Pickup marker */}
        <Mapbox.PointAnnotation
          id="pickup"
          coordinate={[pickup.longitude, pickup.latitude]}
          title="Pickup"
        >
          <View style={[styles.marker, styles.pickupMarker]}>
            <Text style={styles.markerText}>P</Text>
          </View>
        </Mapbox.PointAnnotation>

        {/* Dropoff marker */}
        <Mapbox.PointAnnotation
          id="dropoff"
          coordinate={[dropoff.longitude, dropoff.latitude]}
          title="Drop-off"
        >
          <View style={[styles.marker, styles.dropoffMarker]}>
            <Text style={styles.markerText}>D</Text>
          </View>
        </Mapbox.PointAnnotation>

        {/* Route casing (white border) */}
        {routeGeoJSON && (
          <Mapbox.ShapeSource id="routeCasing" shape={routeGeoJSON}>
            <Mapbox.LineLayer
              id="routeCasingLine"
              style={{
                lineColor: '#ffffff',
                lineWidth: 10,
                lineOpacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* Route line - congestion colored (like MapboxRouteLineApi) */}
        {routeData?.congestion ? (
          <Mapbox.ShapeSource id="routeCongestion" shape={routeData.congestion}>
            <Mapbox.LineLayer
              id="routeCongestionLine"
              style={{
                lineColor: ['get', 'color'],
                lineWidth: 6,
                lineOpacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        ) : routeGeoJSON ? (
          <Mapbox.ShapeSource id="routeSource" shape={routeGeoJSON}>
            <Mapbox.LineLayer
              id="routeLine"
              style={{
                lineColor: Colors.primary,
                lineWidth: 6,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}
      </Mapbox.MapView>

      {/* Route info overlay */}
      {showRouteInfo && routeData && (
        <View style={styles.routeInfoContainer}>
          <Text style={styles.routeInfoText}>
            {(routeData.distance / 1000).toFixed(1)} km • {Math.round(routeData.duration / 60)} min
          </Text>
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
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pickupMarker: {
    backgroundColor: '#10B981',
  },
  dropoffMarker: {
    backgroundColor: '#EF4444',
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  routeInfoContainer: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeInfoText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
});
