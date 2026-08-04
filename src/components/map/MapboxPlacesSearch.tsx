import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MAPBOX_ACCESS_TOKEN } from '../../config/mapbox-config';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeName: string;
}

interface MapboxPlacesSearchProps {
  placeholder?: string;
  onLocationSelect: (location: Location) => void;
  initialValue?: string;
  currentLocation?: { latitude: number; longitude: number };
  proximity?: { latitude: number; longitude: number };
}

interface Feature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
  place_type: string[];
}

/**
 * MapboxPlacesSearch - Location search using Mapbox Geocoding API
 * Provides autocomplete suggestions for addresses and places
 */
export const MapboxPlacesSearch: React.FC<MapboxPlacesSearchProps> = ({
  placeholder = 'Search location',
  onLocationSelect,
  initialValue = '',
  currentLocation,
  proximity,
}) => {
  const [searchText, setSearchText] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchText.length > 2) {
        searchPlaces(searchText);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText]);

  const searchPlaces = async (query: string) => {
    setIsLoading(true);
    try {
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5&country=IN`;

      // Add proximity bias if available
      const searchProximity = proximity || currentLocation;
      if (searchProximity) {
        url += `&proximity=${searchProximity.longitude},${searchProximity.latitude}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      // Check for API errors
      if (data.message) {
        console.error('Mapbox Autocomplete API Error:', data.message);
        Alert.alert(
          'Autocomplete Error',
          `Mapbox API Error: ${data.message}\n\nToken: ${MAPBOX_ACCESS_TOKEN ? 'Set' : 'Missing'}\nToken preview: ${MAPBOX_ACCESS_TOKEN.substring(0, 20)}...`,
          [{ text: 'OK' }]
        );
        setSuggestions([]);
        return;
      }

      if (!response.ok) {
        Alert.alert(
          'Autocomplete Error',
          `Failed to fetch suggestions.\n\nHTTP Status: ${response.status}\nToken preview: ${MAPBOX_ACCESS_TOKEN.substring(0, 20)}...`,
          [{ text: 'OK' }]
        );
        setSuggestions([]);
        return;
      }

      if (data.features) {
        setSuggestions(data.features);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Mapbox search error:', error);
      Alert.alert(
        'Autocomplete Error',
        `Failed to search places.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nToken preview: ${MAPBOX_ACCESS_TOKEN.substring(0, 20)}...`,
        [{ text: 'OK' }]
      );
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlace = (feature: Feature) => {
    setSearchText(feature.place_name);
    setShowResults(false);

    onLocationSelect({
      latitude: feature.center[1],
      longitude: feature.center[0],
      address: feature.place_name,
      placeName: feature.text,
    });
  };

  const handleUseCurrentLocation = async () => {
    if (!currentLocation) return;

    setIsLoading(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${currentLocation.longitude},${currentLocation.latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}`;

      const response = await fetch(url);
      const data = await response.json();

      // Check for API errors
      if (data.message) {
        console.error('Mapbox Reverse Geocoding Error:', data.message);
        Alert.alert(
          'Geocoding Error',
          `Mapbox API Error: ${data.message}\n\nToken preview: ${MAPBOX_ACCESS_TOKEN.substring(0, 20)}...`,
          [{ text: 'OK' }]
        );
        return;
      }

      if (!response.ok) {
        Alert.alert(
          'Geocoding Error',
          `Failed to get location address.\n\nHTTP Status: ${response.status}`,
          [{ text: 'OK' }]
        );
        return;
      }

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        setSearchText(feature.place_name);
        setShowResults(false);

        onLocationSelect({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          address: feature.place_name,
          placeName: feature.text,
        });
      }
    } catch (error) {
      console.error('Current location error:', error);
      Alert.alert(
        'Geocoding Error',
        `Failed to get location address.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceIcon = (placeTypes: string[]) => {
    if (placeTypes.includes('poi')) return 'location';
    if (placeTypes.includes('address')) return 'home';
    if (placeTypes.includes('place')) return 'business';
    return 'location-outline';
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={searchText}
          onChangeText={setSearchText}
          onFocus={() => suggestions.length > 0 && setShowResults(true)}
          placeholderTextColor={Colors.textSecondary}
          returnKeyType="search"
        />
        {isLoading && <ActivityIndicator size="small" color={Colors.primary} />}
        {currentLocation && !isLoading && (
          <TouchableOpacity onPress={handleUseCurrentLocation} style={styles.locationButton}>
            <Ionicons name="locate" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {showResults && suggestions.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelectPlace(item)}
              >
                <Ionicons
                  name={getPlaceIcon(item.place_type)}
                  size={20}
                  color={Colors.textSecondary}
                />
                <View style={styles.resultTextContainer}>
                  <Text style={styles.mainText} numberOfLines={1}>
                    {item.text}
                  </Text>
                  <Text style={styles.secondaryText} numberOfLines={1}>
                    {item.place_name}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            style={styles.resultsList}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
    padding: 0,
  },
  locationButton: {
    padding: Spacing.xs,
  },
  resultsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 300,
    zIndex: 1001,
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultTextContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  mainText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    marginBottom: 2,
  },
  secondaryText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});
