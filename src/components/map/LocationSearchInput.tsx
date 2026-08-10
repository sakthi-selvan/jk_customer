import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';
import { searchPlaces, type PlaceResult } from '../../services/placesSearch';
import { geoApi } from '../../api/geo';

interface LocationSearchInputProps {
  placeholder: string;
  onLocationSelect: (location: LocationResult) => void;
  initialValue?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onFocusNext?: () => void;
  showCurrentLocation?: boolean;
}

export type LocationResult = PlaceResult;

export interface LocationSearchInputRef {
  focus: () => void;
}

export const LocationSearchInput = forwardRef<LocationSearchInputRef, LocationSearchInputProps>(({
  placeholder,
  onLocationSelect,
  initialValue = '',
  icon = 'location',
  onFocusNext,
  showCurrentLocation = false,
}, ref) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [locationSelected, setLocationSelected] = useState(!!initialValue);
  const [searchError, setSearchError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialValue && initialValue !== query) {
      setQuery(initialValue);
      setLocationSelected(true);
    }
  }, [initialValue]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!isFocused || locationSelected) {
      return;
    }

    if (query.length > 2) {
      debounceRef.current = setTimeout(() => {
        searchLocation(query);
      }, 300);
    } else {
      setResults([]);
      setShowResults(false);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isFocused, locationSelected]);

  const handleFocus = () => {
    setIsFocused(true);
    if (locationSelected) {
      setLocationSelected(false);
      setQuery('');
      setResults([]);
      setShowResults(false);
    } else if (results.length > 0) {
      setShowResults(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setTimeout(() => {
      setShowResults(false);
    }, 200);
  };

  const searchLocation = async (searchQuery: string) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const proximity = await getUserProximity();
      const { results, error } = await searchPlaces(searchQuery, {
        proximity: proximity || undefined,
        limit: 5,
      });
      setResults(results);
      setShowResults(true);
      if (!results.length && error) {
        setSearchError(error);
      }
    } catch (error) {
      console.error('Place search error:', error);
      setResults([]);
      setShowResults(true);
      setSearchError('Search failed. Check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const getUserProximity = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getLastKnownPositionAsync();
        if (loc) {
          return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      }
    } catch {}
    return null;
  };

  const handleSelectLocation = (location: LocationResult) => {
    setQuery(location.address);
    setShowResults(false);
    setResults([]);
    setLocationSelected(true);
    inputRef.current?.blur();
    onLocationSelect(location);

    if (onFocusNext) {
      setTimeout(() => {
        onFocusNext();
      }, 150);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLoadingLocation(true);

      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();

      if (currentStatus !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();

        if (newStatus !== 'granted') {
          Alert.alert(
            'Location Permission',
            'You can still enter your location manually by typing in the search box.',
            [{ text: 'OK', style: 'cancel' }]
          );
          setLoadingLocation(false);
          return;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address
      let locationName = 'Current Location';
      let locationAddress = 'Your current location';
      try {
        const place = await geoApi.reverse(latitude, longitude);
        if (place) {
          locationName = place.name;
          locationAddress = place.address;
        }
      } catch {}

      const currentLocation: LocationResult = {
        name: locationName,
        address: locationAddress,
        latitude,
        longitude,
      };

      handleSelectLocation(currentLocation);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert(
        'Location Error',
        'Could not get your location. Please enter it manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingLocation(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={20} color={Colors.primary} style={styles.icon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          value={query}
          onChangeText={(text) => {
            setLocationSelected(false);
            setQuery(text);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={Colors.textSecondary}
        />
        {isSearching && (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 4 }} />
        )}
        {query.length > 0 && (
          <TouchableOpacity onPress={() => {
            setQuery('');
            setResults([]);
            setShowResults(false);
          }}>
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* GPS button below input */}
      {showCurrentLocation && (
        <TouchableOpacity
          style={styles.gpsButton}
          onPress={handleUseCurrentLocation}
          disabled={loadingLocation}
        >
          {loadingLocation ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="navigate-circle" size={20} color={Colors.primary} />
          )}
          <Text style={styles.gpsButtonText}>Use current location</Text>
        </TouchableOpacity>
      )}

      {showResults && (
        <View style={styles.resultsContainer}>
          {results.length > 0 ? (
            <ScrollView
              style={styles.resultsList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {results.map((item, index) => (
                <TouchableOpacity
                  key={`${item.latitude}-${item.longitude}-${index}`}
                  style={styles.resultItem}
                  onPress={() => handleSelectLocation(item)}
                >
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={Colors.textSecondary}
                    style={styles.resultIcon}
                  />
                  <View style={styles.resultText}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={32} color="#CCC" />
              <Text style={styles.noResultsText}>
                {searchError ? 'Search unavailable' : 'No locations found'}
              </Text>
              <Text style={styles.noResultsSubtext}>
                {searchError ||
                  'Try a nearby area or landmark (e.g. Anna Nagar, Railway Station).'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#000000',
    paddingVertical: Spacing.xs,
    fontWeight: FontWeights.medium,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F5FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    marginTop: 8,
    gap: 6,
  },
  gpsButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  resultsContainer: {
    marginTop: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 300,
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  resultIcon: {
    marginRight: Spacing.md,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#000000',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: FontSizes.sm,
    color: '#666666',
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  noResultsText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#999',
    marginTop: Spacing.sm,
  },
  noResultsSubtext: {
    fontSize: FontSizes.sm,
    color: '#BBB',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
