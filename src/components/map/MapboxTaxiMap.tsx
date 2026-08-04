import React, { useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN, MAP_STYLES, ZOOM_LEVELS, ANIMATION_DURATION } from '../../config/mapbox-config';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface Marker {
  id: string;
  coordinate: Coordinate;
  title?: string;
  icon?: string;
  color?: string;
}

interface MapboxTaxiMapProps {
  center?: Coordinate;
  zoom?: number;
  markers?: Marker[];
  showUserLocation?: boolean;
  onMapPress?: (coordinate: Coordinate) => void;
  onMarkerPress?: (markerId: string) => void;
  children?: React.ReactNode;
  styleURL?: string;
}

/**
 * MapboxTaxiMap - Main interactive map component using Mapbox
 * Provides smooth animations, markers, and user location tracking
 */
export const MapboxTaxiMap: React.FC<MapboxTaxiMapProps> = ({
  center,
  zoom = ZOOM_LEVELS.DEFAULT,
  markers = [],
  showUserLocation = true,
  onMapPress,
  onMarkerPress,
  children,
  styleURL = MAP_STYLES.STREETS,
}) => {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapRef = useRef<Mapbox.MapView>(null);

  useEffect(() => {
    if (center && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [center.longitude, center.latitude],
        zoomLevel: zoom,
        animationDuration: ANIMATION_DURATION,
      });
    }
  }, [center, zoom]);

  const handleMapPress = (feature: any) => {
    if (onMapPress && feature.geometry.coordinates) {
      onMapPress({
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
      });
    }
  };

  return (
    <Mapbox.MapView
      ref={mapRef}
      style={styles.map}
      styleURL={styleURL}
      onPress={handleMapPress}
      compassEnabled
      scaleBarEnabled={false}
      attributionEnabled={true}
      logoEnabled={true}
    >
      <Mapbox.Camera
        ref={cameraRef}
        zoomLevel={zoom}
        centerCoordinate={center ? [center.longitude, center.latitude] : [77.5946, 12.9716]}
        animationDuration={ANIMATION_DURATION}
      />

      {showUserLocation && (
        <Mapbox.UserLocation
          visible
          showsUserHeadingIndicator
          androidRenderMode="gps"
        />
      )}

      {markers.map((marker) => (
        <Mapbox.PointAnnotation
          key={marker.id}
          id={marker.id}
          coordinate={[marker.coordinate.longitude, marker.coordinate.latitude]}
          title={marker.title}
          onSelected={() => onMarkerPress?.(marker.id)}
        >
          {marker.icon ? (
            <Mapbox.Callout title={marker.title || ''} />
          ) : (
            <Mapbox.Callout title={marker.title || ''} />
          )}
        </Mapbox.PointAnnotation>
      ))}

      {children}
    </Mapbox.MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
