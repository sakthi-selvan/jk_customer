import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '../src/config/mapbox-config';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';
import { useRideStore } from '../src/store/rideStore';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

interface SearchResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export default function PickOnMapScreen() {
  const { setPendingLocationPick, userLocation } = useRideStore();
  const params = useLocalSearchParams<{ type: 'pickup' | 'dropoff'; lat?: string; lng?: string }>();

  const getInitialCenter = () => {
    if (params.lat && params.lng) {
      return {
        latitude: parseFloat(params.lat),
        longitude: parseFloat(params.lng),
      };
    }
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      };
    }
    return null; // Will fetch current location
  };

  const [center, setCenter] = useState(getInitialCenter() || { latitude: 12.9716, longitude: 77.5946 });
  const [address, setAddress] = useState('Fetching location...');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialCenter = useRef(getInitialCenter());
  const lastFetchedLocation = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // If no initial location, get current location
    if (!initialCenter.current) {
      getCurrentLocation();
    } else {
      fetchAddress(initialCenter.current.latitude, initialCenter.current.longitude, true);
    }

    // Cleanup debounce timers
    return () => {
      if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (searchQuery.length > 2) {
      searchDebounceRef.current = setTimeout(() => {
        searchLocation(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getLastKnownPositionAsync() || await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        if (loc) {
          const { latitude, longitude } = loc.coords;
          setCenter({ latitude, longitude });
          cameraRef.current?.setCamera({
            centerCoordinate: [longitude, latitude],
            zoomLevel: 15,
            animationDuration: 1000,
          });
          fetchAddress(latitude, longitude, true);
        }
      }
    } catch (error) {
      console.log('Could not get current location:', error);
      fetchAddress(center.latitude, center.longitude, true);
    }
  };

  const fetchAddress = async (lat: number, lng: number, skipDebounce = false) => {
    // Check if location changed significantly (>50m)
    if (lastFetchedLocation.current) {
      const latDiff = Math.abs(lastFetchedLocation.current.lat - lat);
      const lngDiff = Math.abs(lastFetchedLocation.current.lng - lng);
      // ~0.0005 degrees = ~50 meters
      if (latDiff < 0.0005 && lngDiff < 0.0005 && !skipDebounce) {
        return; // Too close to last fetch, skip
      }
    }

    lastFetchedLocation.current = { lat, lng };
    setIsLoadingAddress(true);

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.features?.[0]) {
        setAddress(data.features[0].place_name);
      } else {
        setAddress('Unknown location');
      }
    } catch {
      setAddress('Unable to fetch address');
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const searchLocation = async (query: string) => {
    setIsSearching(true);
    try {
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5&country=IN&types=place,locality,neighborhood,address,poi`;
      url += `&proximity=${center.longitude},${center.latitude}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const mapped: SearchResult[] = data.features.map((feature: any) => ({
          name: feature.text,
          address: feature.place_name,
          latitude: feature.center[1],
          longitude: feature.center[0],
        }));
        setSearchResults(mapped);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultSelect = (result: SearchResult) => {
    setCenter({ latitude: result.latitude, longitude: result.longitude });
    setAddress(result.address);
    lastFetchedLocation.current = { lat: result.latitude, lng: result.longitude };
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
    cameraRef.current?.setCamera({
      centerCoordinate: [result.longitude, result.latitude],
      zoomLevel: 16,
      animationDuration: 1000,
    });
  };

  const handleRegionChange = async (feature: any) => {
    if (!mapReady) return; // Ignore initial map load
    const [lng, lat] = feature.geometry.coordinates;
    setCenter({ latitude: lat, longitude: lng });

    // Debounce address fetch - only after 1 second of no movement
    if (addressDebounceRef.current) {
      clearTimeout(addressDebounceRef.current);
    }

    // Show "Moving..." while dragging
    setAddress('Moving map...');

    addressDebounceRef.current = setTimeout(() => {
      fetchAddress(lat, lng);
    }, 1000);
  };

  const handleConfirm = () => {
    setPendingLocationPick({
      name: address.split(',')[0],
      address,
      latitude: center.latitude,
      longitude: center.longitude,
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {params.type === 'pickup' ? 'Pick Pickup Location' : 'Pick Drop Location'}
        </Text>
        <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.searchToggle}>
          <Ionicons name="search" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a location..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
            {isSearching && <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />}
          </View>

          {searchResults.length > 0 && (
            <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={`${result.latitude}-${result.longitude}-${index}`}
                  style={styles.searchResultItem}
                  onPress={() => handleSearchResultSelect(result)}
                >
                  <Ionicons name="location-outline" size={18} color="#666" />
                  <View style={styles.searchResultText}>
                    <Text style={styles.searchResultName}>{result.name}</Text>
                    <Text style={styles.searchResultAddress} numberOfLines={1}>{result.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <Mapbox.MapView
          style={styles.map}
          styleURL="mapbox://styles/mapbox/streets-v12"
          onRegionDidChange={handleRegionChange}
          onDidFinishLoadingMap={() => setMapReady(true)}
        >
          <Mapbox.Camera
            ref={cameraRef}
            zoomLevel={15}
            centerCoordinate={[center.longitude, center.latitude]}
            animationMode="none"
          />
          <Mapbox.UserLocation visible showsUserHeadingIndicator />
        </Mapbox.MapView>

        {/* Center pin */}
        <View style={styles.centerMarker}>
          <Ionicons
            name={params.type === 'pickup' ? 'radio-button-on' : 'location'}
            size={40}
            color={params.type === 'pickup' ? '#4CAF50' : '#F44336'}
          />
        </View>
      </View>

      {/* Bottom card */}
      <View style={styles.bottomCard}>
        <View style={styles.addressContainer}>
          {isLoadingAddress ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, isLoadingAddress && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={isLoadingAddress}
        >
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#000',
    textAlign: 'center',
  },
  searchToggle: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#000',
  },
  searchResults: {
    maxHeight: 250,
    backgroundColor: '#FFF',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  searchResultText: { flex: 1 },
  searchResultName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#000',
    marginBottom: 2,
  },
  searchResultAddress: {
    fontSize: FontSizes.sm,
    color: '#666',
  },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  centerMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    alignItems: 'center',
  },
  bottomCard: {
    backgroundColor: '#FFF',
    padding: Spacing.lg,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    minHeight: 60,
  },
  addressText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#333',
    marginLeft: Spacing.sm,
    fontWeight: FontWeights.medium,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#FFF',
  },
});
