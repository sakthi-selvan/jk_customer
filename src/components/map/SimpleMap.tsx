import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';

interface SimpleMapProps {
  latitude: number;
  longitude: number;
  showMarker?: boolean;
  markerTitle?: string;
}

export const SimpleMap: React.FC<SimpleMapProps> = ({
  latitude,
  longitude,
  showMarker = true,
  markerTitle,
}) => {
  return (
    <View style={styles.container}>
      {/* Static map image */}
      <Image
        source={{ uri: 'https://www.thestatesman.com/wp-content/uploads/2020/04/googl_ED.jpg' }}
        style={styles.mapImage}
        resizeMode="cover"
      />

      {showMarker && (
        <View style={styles.markerContainer}>
          <Ionicons name="location" size={40} color={Colors.error} />
          {markerTitle && (
            <View style={styles.markerCallout}>
              <Text style={styles.markerText}>{markerTitle}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4F8',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -40 }],
    alignItems: 'center',
  },
  markerCallout: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerText: {
    fontSize: FontSizes.sm,
    color: '#000',
    fontWeight: FontWeights.semibold,
  },
});
