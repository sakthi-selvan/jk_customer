import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '../src/config/mapbox-config';
import { initMapbox, MAP_SURFACE_VIEW } from '../src/config/initMapbox';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';
import { useRideStore } from '../src/store/rideStore';

initMapbox();

interface SearchResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

const PLACEHOLDER_ADDRESS = 'Fetching location...';

export default function PickOnMapScreen() {
  const { setPendingLocationPick, userLocation } = useRideStore();
  const params = useLocalSearchParams<{ type: 'pickup' | 'dropoff'; lat?: string; lng?: string }>();
  const pickType = (params.type === 'dropoff' ? 'dropoff' : 'pickup') as 'pickup' | 'dropoff';

  const getInitialCenter = () => {
    if (params.lat && params.lng) {
      const latitude = parseFloat(params.lat);
      const longitude = parseFloat(params.lng);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      };
    }
    return null;
  };

  const initial = getInitialCenter() || { latitude: 11.1085, longitude: 77.3411 }; // Tiruppur default
  const centerRef = useRef(initial);
  const [address, setAddress] = useState(PLACEHOLDER_ADDRESS);
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedLocation = useRef<{ lat: number; lng: number } | null>(null);
  const fetchSeq = useRef(0);
  const isProgrammaticMove = useRef(false);

  useEffect(() => {
    fetchAddress(initial.latitude, initial.longitude, true);
    if (!getInitialCenter()) {
      getCurrentLocation();
    }
    return () => {
      if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchQuery.length > 2) {
      searchDebounceRef.current = setTimeout(() => searchLocation(searchQuery), 300);
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
      if (status !== 'granted') return;
      const loc =
        (await Location.getLastKnownPositionAsync()) ||
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
      if (!loc) return;
      const { latitude, longitude } = loc.coords;
      moveCamera(latitude, longitude, 15);
      fetchAddress(latitude, longitude, true);
    } catch (error) {
      console.log('Could not get current location:', error);
    }
  };

  const moveCamera = (latitude: number, longitude: number, zoomLevel = 16) => {
    centerRef.current = { latitude, longitude };
    isProgrammaticMove.current = true;
    cameraRef.current?.setCamera({
      centerCoordinate: [longitude, latitude],
      zoomLevel,
      animationDuration: 600,
    });
    setTimeout(() => {
      isProgrammaticMove.current = false;
    }, 700);
  };

  const reverseGeocodeFallback = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const p = places?.[0];
      if (!p) return null;
      const parts = [p.name, p.street, p.district, p.city, p.region].filter(Boolean);
      return parts.length ? parts.join(', ') : null;
    } catch {
      return null;
    }
  };

  const fetchAddress = async (lat: number, lng: number, skipDebounce = false) => {
    if (lastFetchedLocation.current && !skipDebounce) {
      const latDiff = Math.abs(lastFetchedLocation.current.lat - lat);
      const lngDiff = Math.abs(lastFetchedLocation.current.lng - lng);
      if (latDiff < 0.0005 && lngDiff < 0.0005) return;
    }

    lastFetchedLocation.current = { lat, lng };
    const seq = ++fetchSeq.current;
    setIsLoadingAddress(true);

    try {
      let resolved: string | null = null;

      if (MAPBOX_ACCESS_TOKEN) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.features?.[0]?.place_name) {
          resolved = data.features[0].place_name;
        }
      }

      if (!resolved) {
        resolved = await reverseGeocodeFallback(lat, lng);
      }

      if (seq !== fetchSeq.current) return;
      setAddress(resolved || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      if (seq !== fetchSeq.current) return;
      const fallback = await reverseGeocodeFallback(lat, lng);
      if (seq !== fetchSeq.current) return;
      setAddress(fallback || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      if (seq === fetchSeq.current) setIsLoadingAddress(false);
    }
  };

  const searchLocation = async (query: string) => {
    if (!MAPBOX_ACCESS_TOKEN) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5&country=IN&types=place,locality,neighborhood,address,poi`;
      url += `&proximity=${centerRef.current.longitude},${centerRef.current.latitude}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.features?.length) {
        setSearchResults(
          data.features.map((feature: any) => ({
            name: feature.text,
            address: feature.place_name,
            latitude: feature.center[1],
            longitude: feature.center[0],
          }))
        );
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultSelect = (result: SearchResult) => {
    setAddress(result.address);
    lastFetchedLocation.current = { lat: result.latitude, lng: result.longitude };
    setIsLoadingAddress(false);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
    moveCamera(result.latitude, result.longitude, 16);
  };

  const handleRegionChange = (feature: any) => {
    if (!mapReady || isProgrammaticMove.current) return;
    const [lng, lat] = feature.geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    centerRef.current = { latitude: lat, longitude: lng };

    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    setIsLoadingAddress(true);
    addressDebounceRef.current = setTimeout(() => {
      fetchAddress(lat, lng);
    }, 650);
  };

  const handleConfirm = async () => {
    const { latitude, longitude } = centerRef.current;
    setIsLoadingAddress(true);

    let resolved = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    try {
      if (MAPBOX_ACCESS_TOKEN) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.features?.[0]?.place_name) resolved = data.features[0].place_name;
      } else {
        const fb = await reverseGeocodeFallback(latitude, longitude);
        if (fb) resolved = fb;
      }
    } catch {
      const fb = await reverseGeocodeFallback(latitude, longitude);
      if (fb) resolved = fb;
    } finally {
      setIsLoadingAddress(false);
    }

    setAddress(resolved);
    setPendingLocationPick({
      name: resolved.split(',')[0],
      address: resolved,
      latitude,
      longitude,
      pickType,
    });
    router.back();
  };

  const canConfirm = !isLoadingAddress;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {pickType === 'pickup' ? 'Pick Pickup Location' : 'Pick Drop Location'}
        </Text>
        <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.searchToggle}>
          <Ionicons name="search" size={24} color="#000" />
        </TouchableOpacity>
      </View>

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

      <View style={styles.mapContainer}>
        <Mapbox.MapView
          style={styles.map}
          styleURL="mapbox://styles/mapbox/streets-v12"
          surfaceView={MAP_SURFACE_VIEW}
          onRegionDidChange={handleRegionChange}
          onDidFinishLoadingMap={() => setMapReady(true)}
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              zoomLevel: 15,
              centerCoordinate: [initial.longitude, initial.latitude],
            }}
            animationMode="none"
          />
          <Mapbox.UserLocation visible showsUserHeadingIndicator />
        </Mapbox.MapView>

        <View style={styles.centerMarker}>
          <Ionicons
            name={pickType === 'pickup' ? 'radio-button-on' : 'location'}
            size={40}
            color={pickType === 'pickup' ? '#4CAF50' : '#F44336'}
          />
        </View>
      </View>

      <View style={styles.bottomCard}>
        <View style={styles.addressContainer}>
          {isLoadingAddress ? (
            <>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.addressText} numberOfLines={2}>
                {address && address !== PLACEHOLDER_ADDRESS && address !== 'Moving map...'
                  ? address
                  : 'Getting address…'}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm}
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
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#333',
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
