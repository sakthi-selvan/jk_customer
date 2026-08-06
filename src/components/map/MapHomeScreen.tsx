import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FleetMap } from './FleetMap';
import { FleetCategory } from './VehicleMarker';
import { RideTrackingMap } from './RideTrackingMap';
import { RideBottomSheet } from '../ride/RideBottomSheet';
import { useAuthStore } from '../../store/authStore';
import { useRideStore } from '../../store/rideStore';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';
import { MAPBOX_ACCESS_TOKEN } from '../../config/mapbox-config';
import { bookingEnhancedApi, userEnhancedApi } from '../../api/booking-enhanced';
import { EnhancedRide, SavedPlaces } from '../../types/enhanced';

const { width, height } = Dimensions.get('window');

/** Floating location card sits below safe area; chips sit below the card. */
const LOCATION_CARD_TOP = 12;
const LOCATION_CARD_HEIGHT = 56;

interface MapHomeScreenProps {
  onBookRide: () => void;
}

export const MapHomeScreen: React.FC<MapHomeScreenProps> = ({ onBookRide }) => {
  const { user, logout } = useAuthStore();
  const { activeRide, getActiveRide, driverLocation, startTracking, stopTracking, setUserLocation } = useRideStore();
  const [liveEta, setLiveEta] = useState<{ distance: number; duration: number } | null>(null);
  const insets = useSafeAreaInsets();

  // Default location (Bangalore city center)
  const [location, setLocation] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
  });
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [locationName, setLocationName] = useState('Fetching location...');
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const [menuOpen, setMenuOpen] = useState(false);
  const [recentDropoffs, setRecentDropoffs] = useState<Array<{ name: string; address: string; latitude: number; longitude: number }>>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlaces>({});
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; address: string; latitude: number; longitude: number }>>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [floatingBarActive, setFloatingBarActive] = useState(true);
  const floatingBarOpacity = useRef(new Animated.Value(1)).current;
  const [fleetFilter, setFleetFilter] = useState<FleetCategory>('all');
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [searchingNearbyPins, setSearchingNearbyPins] = useState<
    Array<{ id: string; latitude: number; longitude: number; category: string; heading?: number | null }>
  >([]);
  const menuSlideAnim = useRef(new Animated.Value(-320)).current;

  useEffect(() => {
    getUserLocation();
    fetchRecentAndSaved();
  }, []);

  // While searching, show real nearby captains on the tracking map (same UX as fleet map).
  useEffect(() => {
    if (!activeRide || activeRide.status !== 'pending') {
      setSearchingNearbyPins([]);
      return;
    }
    const pickupLat = (activeRide as any).pickup_lat;
    const pickupLng = (activeRide as any).pickup_lng;
    if (!Number.isFinite(pickupLat) || !Number.isFinite(pickupLng)) return;

    let cancelled = false;
    const load = async () => {
      try {
        const res = await bookingEnhancedApi.getNearbyDriversLocations(pickupLat, pickupLng, {
          vehicle_category: (activeRide as any).vehicle_category || undefined,
        });
        if (cancelled) return;
        setSearchingNearbyPins(
          (res.drivers || []).map((d) => ({
            id: d.id,
            latitude: d.latitude,
            longitude: d.longitude,
            category: (d as any).category || d.vehicle_type || 'mini',
            heading: (d as any).heading ?? null,
          }))
        );
      } catch {
        if (!cancelled) setSearchingNearbyPins([]);
      }
    };
    load();
    const t = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [activeRide?.id, activeRide?.status, (activeRide as any)?.vehicle_category]);

  // Clear ETA when ride leaves live tracking
  useEffect(() => {
    if (!activeRide || !['pending', 'accepted', 'started'].includes(activeRide.status)) {
      setLiveEta(null);
    }
  }, [activeRide?.id, activeRide?.status]);

  const fetchRecentAndSaved = async () => {
    try {
      const [history, places] = await Promise.all([
        bookingEnhancedApi.getRideHistory().catch(() => []),
        userEnhancedApi.getSavedPlaces().catch(() => ({})),
      ]);

      if (places) setSavedPlaces(places);

      if (history && history.length > 0) {
        const seen = new Set<string>();
        const recent: Array<{ name: string; address: string; latitude: number; longitude: number }> = [];
        for (const ride of history) {
          if (ride.dropoff_location && ride.dropoff_lat && ride.dropoff_lng) {
            const key = `${ride.dropoff_lat.toFixed(3)},${ride.dropoff_lng.toFixed(3)}`;
            if (!seen.has(key)) {
              seen.add(key);
              recent.push({
                name: ride.dropoff_location.split(',')[0],
                address: ride.dropoff_location,
                latitude: ride.dropoff_lat,
                longitude: ride.dropoff_lng,
              });
            }
            if (recent.length >= 5) break;
          }
        }
        setRecentDropoffs(recent);
      }
    } catch {}
  };

  // Start/stop ride tracking based on active ride status
  useEffect(() => {
    if (activeRide && ['pending', 'accepted', 'started'].includes(activeRide.status)) {
      startTracking();
    } else {
      stopTracking();
      setLiveEta(null);
    }
    return () => stopTracking();
  }, [activeRide?.status]);

  const getUserLocation = async () => {
    try {
      // Check permission
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log('Location permission not granted');
        setLocationPermission(false);
        setLocationName('Bangalore (Enable GPS)');
        setIsLoadingLocation(false);
        return;
      }

      setLocationPermission(true);

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = currentLocation.coords;
      setLocation({ latitude, longitude });

      // Reverse geocode to get location name
      let name = 'Current Location';
      let address = 'Your current location';
      try {
        const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocoded[0]) {
          name = [
            geocoded[0].street || geocoded[0].name,
            geocoded[0].city,
          ]
            .filter(Boolean)
            .join(', ') || 'Current Location';
          address = [geocoded[0].street, geocoded[0].district, geocoded[0].city, geocoded[0].region]
            .filter(Boolean)
            .join(', ');
          setLocationName(name);
        }
      } catch (geocodeError) {
        console.log('Geocoding failed:', geocodeError);
        setLocationName('Current Location');
      }

      // Save to store for book-ride screen
      setUserLocation({ latitude, longitude, name, address });

      setIsLoadingLocation(false);
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationPermission(false);
      setLocationName('Bangalore (GPS Error)');
      setIsLoadingLocation(false);
    }
  };

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (searchQuery.length > 2) {
      searchDebounceRef.current = setTimeout(() => {
        searchForLocation(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const searchForLocation = async (query: string) => {
    setIsSearchingLocation(true);
    try {
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5&country=IN&types=place,locality,neighborhood,address,poi`;
      url += `&proximity=${location.longitude},${location.latitude}`;

      const response = await fetch(url);
      const data = await response.json();

      // Check for API errors
      if (data.message) {
        console.error('Mapbox API Error:', data.message);
        Alert.alert(
          'Search Error',
          `Mapbox API Error: ${data.message}\n\nToken: ${MAPBOX_ACCESS_TOKEN ? 'Set' : 'Missing'}\nToken preview: ${MAPBOX_ACCESS_TOKEN.substring(0, 20)}...\n\nResponse: ${JSON.stringify(data)}`,
          [{ text: 'OK' }]
        );
        setSearchResults([]);
        return;
      }

      if (!response.ok) {
        Alert.alert(
          'Search Error',
          `Failed to search location.\n\nHTTP Status: ${response.status}\nURL: ${url.substring(0, 100)}...`,
          [{ text: 'OK' }]
        );
        setSearchResults([]);
        return;
      }

      if (data.features && data.features.length > 0) {
        const mapped = data.features.map((feature: any) => ({
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
      console.error('Location search error:', error);
      Alert.alert(
        'Search Error',
        `Failed to search location.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nToken preview: ${MAPBOX_ACCESS_TOKEN.substring(0, 20)}...`,
        [{ text: 'OK' }]
      );
      setSearchResults([]);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleLocationSearchSelect = (item: { name: string; address: string; latitude: number; longitude: number }) => {
    setLocation({ latitude: item.latitude, longitude: item.longitude });
    setLocationName(item.name || item.address.split(',')[0]);
    setShowLocationSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const floatingBarTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activateFloatingBar = () => {
    setFloatingBarActive(true);
    Animated.timing(floatingBarOpacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const deactivateFloatingBar = () => {
    // Keep hamburger always usable — do not dim the bar.
  };

  const toggleMenu = () => {
    const toValue = menuOpen ? -320 : 0;
    Animated.spring(menuSlideAnim, {
      toValue,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    setMenuOpen(!menuOpen);
  };

  const handleRideComplete = async () => {
    // Refresh to check if ride is truly complete
    await getActiveRide();
  };

  // Check if we should show active ride in bottom sheet
  const showActiveRideSheet = activeRide && ['pending', 'accepted', 'started'].includes(activeRide.status);

  const isTrackingRide = activeRide && ['pending', 'accepted', 'started'].includes(activeRide.status);
  const fleetChipBarTop = LOCATION_CARD_TOP + LOCATION_CARD_HEIGHT + Spacing.sm;

  return (
    <View style={styles.container}>
      {/* Status bar area - not touchable */}
      <View style={[styles.statusBarSpacer, { height: insets.top }]} />

      {/* Map: tracking view or normal */}
      {isTrackingRide ? (
        <RideTrackingMap
          key={String(activeRide.id)}
          rideStatus={activeRide.status as 'pending' | 'accepted' | 'started'}
          pickupLocation={{ latitude: (activeRide as any).pickup_lat, longitude: (activeRide as any).pickup_lng }}
          dropoffLocation={(activeRide as any).dropoff_lat ? { latitude: (activeRide as any).dropoff_lat, longitude: (activeRide as any).dropoff_lng } : null}
          driverLocation={driverLocation}
          vehicleCategory={(activeRide as any).vehicle_category || (activeRide as any).driver_vehicle_type}
          nearbyPins={activeRide.status === 'pending' ? searchingNearbyPins : undefined}
          onEtaUpdate={(dist, dur) => setLiveEta({ distance: dist, duration: dur })}
        />
      ) : (
        <FleetMap
          latitude={location.latitude}
          longitude={location.longitude}
          zoom={14}
          vehicleFilter={fleetFilter}
          onVehicleFilterChange={setFleetFilter}
          showFilterChips
          chipBarTop={fleetChipBarTop}
        />
      )}

      {/* Floating Location Card */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={activateFloatingBar}
        style={[styles.floatingLocationCard, { top: insets.top + LOCATION_CARD_TOP }]}
      >
        <Animated.View style={[styles.floatingBarInner, { opacity: floatingBarOpacity }]}>
          <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
            <Ionicons name="menu" size={24} color="#000000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.locationInfo}
            onPress={() => setShowLocationSearch(true)}
            activeOpacity={0.7}
          >
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="location" size={16} color={Colors.primary} />
            )}
            <Text style={styles.locationText} numberOfLines={1}>
              {locationName}
            </Text>
            <Ionicons name="pencil" size={14} color="#999" style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={getUserLocation}
            disabled={isLoadingLocation}
          >
            <Ionicons
              name={isLoadingLocation ? "refresh" : "navigate-circle-outline"}
              size={22}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>

      {/* Side Menu Drawer */}
      <Animated.View
        style={[
          styles.menuDrawer,
          { transform: [{ translateX: menuSlideAnim }] },
        ]}
      >
        <View style={styles.menuHeader}>
          <View style={styles.menuHeaderContent}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {(user?.name || 'G').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.menuUserName}>{user?.name || 'Guest'}</Text>
              <Text style={styles.menuUserPhone}>{user?.phone || 'Not logged in'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={toggleMenu} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.menuContent} showsVerticalScrollIndicator={false}>
          {user?.ride_otp && (
            <View style={styles.menuOtpCard}>
              <View style={styles.otpHeader}>
                <Ionicons name="shield-checkmark" size={18} color="#1976D2" />
                <Text style={styles.menuOtpLabel}>Your Ride OTP</Text>
              </View>
              <View style={styles.otpNumberContainer}>
                <Text style={styles.menuOtpNumber}>{user.ride_otp}</Text>
              </View>
              <View style={styles.otpFooter}>
                <Ionicons name="information-circle" size={14} color="#1976D2" />
                <Text style={styles.otpSubtext}>Share with driver to start ride</Text>
              </View>
            </View>
          )}

          <View style={styles.menuSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                toggleMenu();
                router.push('/');
              }}
            >
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="home" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Home</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                toggleMenu();
                router.push('/rides');
              }}
            >
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="list" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>My Rides</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                toggleMenu();
                router.push('/profile');
              }}
            >
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="person" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              Alert.alert(
                'Logout',
                'Are you sure you want to logout?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                      toggleMenu();
                      await logout();
                      router.replace('/login');
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="log-out" size={24} color="#E74C3C" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>

      {/* Overlay when menu is open */}
      {menuOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleMenu}
        />
      )}

      {/* Center Location Button */}
      <TouchableOpacity
        style={styles.centerButton}
        onPress={getUserLocation}
      >
        <Ionicons name="locate" size={24} color={Colors.primary} />
      </TouchableOpacity>

      {/* Location Search Modal */}
      <Modal
        visible={showLocationSearch}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLocationSearch(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.searchModalContainer}
        >
          <View style={[styles.searchModalHeader, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => {
              setShowLocationSearch(false);
              setSearchQuery('');
              setSearchResults([]);
            }}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.searchModalTitle}>Set your location</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.searchModalInputContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchModalInput}
              placeholder="Search for area, street name..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.useGpsButton}
            onPress={() => {
              setShowLocationSearch(false);
              setSearchQuery('');
              setSearchResults([]);
              getUserLocation();
            }}
          >
            <View style={styles.useGpsIconContainer}>
              <Ionicons name="navigate" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.useGpsText}>Use current location</Text>
              <Text style={styles.useGpsSubtext}>Via GPS</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          {isSearchingLocation && (
            <View style={styles.searchLoadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.searchLoadingText}>Searching...</Text>
            </View>
          )}

          <ScrollView style={styles.searchResultsList} keyboardShouldPersistTaps="handled">
            {searchResults.map((item, index) => (
              <TouchableOpacity
                key={`${item.latitude}-${item.longitude}-${index}`}
                style={styles.searchResultItem}
                onPress={() => handleLocationSearchSelect(item)}
              >
                <View style={styles.searchResultIconContainer}>
                  <Ionicons name="location-outline" size={20} color="#666" />
                </View>
                <View style={styles.searchResultTextContainer}>
                  <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.searchResultAddress} numberOfLines={2}>{item.address}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bottom Booking Card OR Active Ride Sheet */}
      {showActiveRideSheet ? (
        <RideBottomSheet ride={activeRide as any} onRideComplete={handleRideComplete} liveEta={liveEta} />
      ) : (
        <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom, 8) + 4 }]}>
          <View style={styles.sheetHandle} />
          {activeRide ? (
            <TouchableOpacity
              style={styles.activeRideCard}
              onPress={() => router.push('/rides')}
            >
              <View style={styles.activeRideLeft}>
                <Ionicons name="car" size={28} color={Colors.primary} />
                <View style={styles.activeRideInfo}>
                  <Text style={styles.activeRideTitle}>Active Ride</Text>
                  <Text style={styles.activeRideStatus}>
                    {activeRide.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#000" />
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.bookingPrompt}>Where to?</Text>
              <TouchableOpacity style={styles.searchBox} onPress={onBookRide} activeOpacity={0.85}>
                <View style={styles.searchIconWrap}>
                  <Ionicons name="search" size={18} color={Colors.white} />
                </View>
                <Text style={styles.searchText}>Enter destination</Text>
                <View style={styles.bookNowPill}>
                  <Text style={styles.bookNowText}>Book</Text>
                </View>
              </TouchableOpacity>

              {(savedPlaces.home || savedPlaces.work || recentDropoffs.length > 0) && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickChips}
                  style={styles.quickChipsScroll}
                >
                  {savedPlaces.home && (
                    <TouchableOpacity style={styles.savedPlaceChip} onPress={onBookRide}>
                      <Ionicons name="home" size={15} color={Colors.primary} />
                      <Text style={styles.savedPlaceText} numberOfLines={1}>Home</Text>
                    </TouchableOpacity>
                  )}
                  {savedPlaces.work && (
                    <TouchableOpacity style={styles.savedPlaceChip} onPress={onBookRide}>
                      <Ionicons name="briefcase" size={15} color={Colors.primary} />
                      <Text style={styles.savedPlaceText} numberOfLines={1}>Work</Text>
                    </TouchableOpacity>
                  )}
                  {recentDropoffs.slice(0, 4).map((item, index) => (
                    <TouchableOpacity
                      key={`${item.latitude}-${index}`}
                      style={styles.recentChip}
                      onPress={onBookRide}
                    >
                      <Ionicons name="time-outline" size={14} color="#64748B" />
                      <Text style={styles.recentChipText} numberOfLines={1}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {sheetExpanded && recentDropoffs.length > 0 && (
                <View style={styles.recentSection}>
                  <Text style={styles.recentTitle}>Recent</Text>
                  {recentDropoffs.slice(0, 3).map((item, index) => (
                    <TouchableOpacity
                      key={`expanded-${item.latitude}-${index}`}
                      style={styles.recentItem}
                      onPress={onBookRide}
                    >
                      <View style={styles.recentIconContainer}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                      </View>
                      <View style={styles.recentTextContainer}>
                        <Text style={styles.recentName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.recentAddress} numberOfLines={1}>{item.address}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#CCC" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {(savedPlaces.home || savedPlaces.work || recentDropoffs.length > 0) && (
                <TouchableOpacity
                  style={styles.expandToggle}
                  onPress={() => setSheetExpanded((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                >
                  <Text style={styles.expandToggleText}>
                    {sheetExpanded ? 'Show less' : 'More places'}
                  </Text>
                  <Ionicons
                    name={sheetExpanded ? 'chevron-down' : 'chevron-up'}
                    size={16}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  statusBarSpacer: {
    backgroundColor: '#000',
    zIndex: 1000,
  },
  map: {
    flex: 1,
  },
  floatingLocationCard: {
    position: 'absolute',
    top: 12,
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: BorderRadius.xl,
    elevation: 999,
    zIndex: 999,
  },
  floatingBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 999,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  locationInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#000000',
    marginLeft: Spacing.xs,
  },
  notificationButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  menuDrawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 320,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10000,
  },
  menuHeader: {
    backgroundColor: Colors.primarySoft,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  userInfo: {
    flex: 1,
  },
  menuUserName: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
    marginBottom: 4,
  },
  menuUserPhone: {
    fontSize: FontSizes.md,
    color: Colors.inkSecondary,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: Spacing.md,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  menuOtpCard: {
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: '#E3F2FD',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#1976D2',
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  menuOtpLabel: {
    fontSize: FontSizes.sm,
    color: '#1976D2',
    fontWeight: FontWeights.bold,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
  },
  otpNumberContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.xs,
    borderWidth: 1.5,
    borderColor: '#1976D2',
    borderStyle: 'dashed',
  },
  menuOtpNumber: {
    fontSize: 32,
    fontWeight: FontWeights.bold,
    color: '#1976D2',
    letterSpacing: 10,
    textAlign: 'center',
  },
  otpFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  otpSubtext: {
    fontSize: FontSizes.xs,
    color: '#1565C0',
    textAlign: 'center',
    marginLeft: Spacing.xs,
    flex: 1,
  },
  menuSection: {
    marginTop: Spacing.md,
    backgroundColor: '#FFFFFF',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuItemText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#333333',
    fontWeight: FontWeights.medium,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: '#FFF5F5',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutButtonText: {
    fontSize: FontSizes.md,
    color: '#E74C3C',
    fontWeight: FontWeights.semibold,
    marginLeft: Spacing.sm,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
  },
  centerButton: {
    position: 'absolute',
    right: Spacing.md,
    bottom: 148,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.sheet,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: Spacing.md,
    paddingTop: 6,
    shadowColor: '#1A1B2E',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 14,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 8,
  },
  bookingPrompt: {
    fontSize: 18,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  bookingSubprompt: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  searchIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#64748B',
    marginLeft: Spacing.sm,
    fontWeight: FontWeights.medium,
  },
  bookNowPill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  bookNowText: {
    color: Colors.white,
    fontWeight: FontWeights.bold,
    fontSize: FontSizes.sm,
  },
  quickChipsScroll: {
    marginBottom: 2,
    maxHeight: 44,
  },
  quickChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  savedPlacesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  savedPlaceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F5FF',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E0E0FF',
    maxWidth: 140,
  },
  savedPlaceText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: '#333',
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: 160,
  },
  recentChipText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: '#334155',
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 6,
    paddingBottom: 2,
  },
  expandToggleText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  recentSection: {
    marginTop: Spacing.xs,
  },
  recentTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: '#999',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  recentIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  recentTextContainer: {
    flex: 1,
  },
  recentName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: '#000',
  },
  recentAddress: {
    fontSize: FontSizes.xs,
    color: '#999',
    marginTop: 1,
  },
  activeRideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  activeRideLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeRideInfo: {
    marginLeft: Spacing.md,
  },
  activeRideTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  activeRideStatus: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
    marginTop: 2,
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchModalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#000',
  },
  searchModalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#F5F5F5',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchModalInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#000',
    marginLeft: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  useGpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  useGpsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  useGpsText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  useGpsSubtext: {
    fontSize: FontSizes.sm,
    color: '#999',
    marginTop: 2,
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  searchLoadingText: {
    fontSize: FontSizes.sm,
    color: '#999',
    marginLeft: Spacing.sm,
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  searchResultIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  searchResultTextContainer: {
    flex: 1,
  },
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
});
