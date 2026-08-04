import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import Mapbox, { Camera, MapView, ShapeSource, CircleLayer, UserLocation } from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE_URL } from '../../config/mapbox';

// Initialize Mapbox
try {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
} catch (error) {
  console.error('Failed to set Mapbox token:', error);
  Alert.alert(
    'Map Configuration Error',
    `Failed to initialize map: ${error instanceof Error ? error.message : 'Unknown error'}\n\nToken: ${MAPBOX_ACCESS_TOKEN.substring(0, 20)}...`,
    [{ text: 'OK' }]
  );
}

interface MapboxMapProps {
  latitude: number;
  longitude: number;
  showMarker?: boolean;
  markerTitle?: string;
  zoom?: number;
  onRegionChange?: (latitude: number, longitude: number) => void;
}

export const MapboxMap: React.FC<MapboxMapProps> = ({
  latitude,
  longitude,
  showMarker = true,
  markerTitle,
  zoom = 14,
  onRegionChange,
}) => {
  const cameraRef = useRef<Camera>(null);
  const [hasShownError, setHasShownError] = useState(false);

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [longitude, latitude],
        zoomLevel: zoom,
        animationDuration: 1000,
      });
    }
  }, [latitude, longitude, zoom]);

  const handleMapError = (error: any) => {
    console.error('Map Error:', error);
    if (!hasShownError) {
      setHasShownError(true);
      Alert.alert(
        'Map Loading Error',
        `Failed to load map tiles.\n\nError: ${error?.message || 'Unknown error'}\n\nToken status: ${MAPBOX_ACCESS_TOKEN ? 'Set' : 'Missing'}\nToken preview: ${MAPBOX_ACCESS_TOKEN.substring(0, 15)}...`,
        [{ text: 'OK' }]
      );
    }
  };

  // GeoJSON for marker
  const markerGeoJSON = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    properties: {
      title: markerTitle,
    },
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        styleURL={MAPBOX_STYLE_URL}
        compassEnabled={false}
        scaleBarEnabled={false}
        onDidFailLoadingMap={handleMapError}
      >
        <Camera
          ref={cameraRef}
          zoomLevel={zoom}
          centerCoordinate={[longitude, latitude]}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {/* Show user's current location as blue dot */}
        <UserLocation
          visible={true}
          showsUserHeadingIndicator={true}
          androidRenderMode="compass"
        />

        {/* Custom marker */}
        {showMarker && (
          <ShapeSource id="markerSource" shape={markerGeoJSON as any}>
            <CircleLayer
              id="markerLayer"
              style={{
                circleRadius: 12,
                circleColor: '#FF4444',
                circleStrokeColor: '#FFFFFF',
                circleStrokeWidth: 3,
              }}
            />
          </ShapeSource>
        )}
      </MapView>
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
});
