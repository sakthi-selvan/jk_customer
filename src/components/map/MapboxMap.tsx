import { initMapbox, mapboxTokenPresent } from '../../config/initMapbox';
import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import Mapbox, { Camera, MapView, ShapeSource, CircleLayer, UserLocation } from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE_URL } from '../../config/mapbox';

// Initialize Mapbox
initMapbox();

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
        'The map could not load. Check your internet connection and try again.',
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

  if (!mapboxTokenPresent()) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Map unavailable. Please try again shortly.</Text></View>;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        styleURL={MAPBOX_STYLE_URL}
        compassEnabled={false}
        scaleBarEnabled={false}
        surfaceView={false}
        onDidFailLoadingMap={() => handleMapError(new Error("Map unavailable"))}
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
