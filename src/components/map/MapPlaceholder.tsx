import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface MapPlaceholderProps {
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  showRoute?: boolean;
  pickupLocation?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  dropoffLocation?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
}

export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({
  userLocation,
  showRoute,
  pickupLocation,
  dropoffLocation,
}) => {
  return (
    <View style={styles.container}>
      {/* Gradient background to simulate map */}
      <View style={styles.mapBackground}>
        {/* Grid lines to simulate map tiles */}
        <View style={styles.gridContainer}>
          {[...Array(10)].map((_, i) => (
            <View key={`h-${i}`} style={[styles.gridLine, { top: i * (height / 10) }]} />
          ))}
          {[...Array(10)].map((_, i) => (
            <View key={`v-${i}`} style={[styles.gridLineVertical, { left: i * (width / 10) }]} />
          ))}
        </View>

        {/* Info overlay */}
        <View style={styles.infoOverlay}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={Colors.primary} />
            <Text style={styles.infoTitle}>Map Preview Mode</Text>
            <Text style={styles.infoText}>
              Maps require a development build. All features work - this is just a placeholder!
            </Text>
          </View>
        </View>

        {/* User location indicator */}
        {userLocation && (
          <View style={styles.userLocationContainer}>
            <View style={styles.userMarker}>
              <View style={styles.userMarkerPulse} />
              <View style={styles.userMarkerCenter} />
            </View>
            <Text style={styles.locationLabel}>Your Location</Text>
            <Text style={styles.locationCoords}>
              {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        {/* Route indicators */}
        {showRoute && pickupLocation && dropoffLocation && (
          <View style={styles.routeContainer}>
            <View style={styles.routeCard}>
              <View style={styles.routeItem}>
                <View style={styles.pickupMarker}>
                  <View style={styles.pickupDot} />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel}>Pickup</Text>
                  <Text style={styles.routeName} numberOfLines={1}>
                    {pickupLocation.name || 'Selected Location'}
                  </Text>
                </View>
              </View>

              <View style={styles.routeLine}>
                <View style={styles.routeDash} />
                <Ionicons name="arrow-down" size={20} color={Colors.primary} />
                <View style={styles.routeDash} />
              </View>

              <View style={styles.routeItem}>
                <View style={styles.dropoffMarker}>
                  <View style={styles.dropoffDot} />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel}>Dropoff</Text>
                  <Text style={styles.routeName} numberOfLines={1}>
                    {dropoffLocation.name || 'Selected Location'}
                  </Text>
                </View>
              </View>

              <View style={styles.distanceInfo}>
                <Ionicons name="navigate" size={16} color={Colors.textSecondary} />
                <Text style={styles.distanceText}>
                  Distance: {calculateDistance(pickupLocation, dropoffLocation).toFixed(1)} km
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Map controls overlay */}
        <View style={styles.mapControls}>
          <View style={styles.mapTypeIndicator}>
            <Ionicons name="map" size={16} color={Colors.primary} />
            <Text style={styles.mapTypeText}>Preview Mode</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// Simple distance calculation (Haversine formula)
function calculateDistance(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.latitude - point1.latitude);
  const dLon = toRad(point2.longitude - point1.longitude);
  const lat1 = toRad(point1.latitude);
  const lat2 = toRad(point2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapBackground: {
    flex: 1,
    backgroundColor: '#E8F4F8',
    position: 'relative',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#D0E4EC',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#D0E4EC',
  },
  infoOverlay: {
    position: 'absolute',
    top: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 300,
  },
  infoTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  userLocationContainer: {
    position: 'absolute',
    bottom: 200,
    left: '50%',
    marginLeft: -40,
    alignItems: 'center',
  },
  userMarker: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
  },
  userMarkerCenter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  locationLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginTop: Spacing.xs,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  locationCoords: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  routeContainer: {
    position: 'absolute',
    top: '50%',
    left: Spacing.lg,
    right: Spacing.lg,
    marginTop: -150,
  },
  routeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2ECC71',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  dropoffMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropoffDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E74C3C',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  routeInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  routeLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
    marginBottom: 2,
  },
  routeName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  routeLine: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginLeft: 20,
  },
  routeDash: {
    width: 2,
    height: 15,
    backgroundColor: Colors.primary,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  distanceText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  mapControls: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
  },
  mapTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapTypeText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
    marginLeft: Spacing.xs,
  },
});
