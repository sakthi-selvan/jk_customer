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
import { router, usePathname } from 'expo-router';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FleetMap } from './FleetMap';
import { FLEET_FILTERS, FleetCategory } from './VehicleMarker';
import { RideTrackingMap } from './RideTrackingMap';
import { RideBottomSheet } from '../ride/RideBottomSheet';
import { VehicleCategoryImage } from '../ride/VehicleCategoryImage';
import { useAuthStore } from '../../store/authStore';
import { useRideStore } from '../../store/rideStore';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';
import { searchPlaces } from '../../services/placesSearch';
import { bookingEnhancedApi, userEnhancedApi } from '../../api/booking-enhanced';
import { EnhancedRide, SavedPlaces } from '../../types/enhanced';
import { navigateIfNeeded } from '../../utils/navigation';
import { samePinList } from '../../utils/stableUpdate';

const { width: screenWidth } = Dimensions.get('window');
const MENU_DRAWER_WIDTH = Math.min(screenWidth * 0.88, 360);

/** Floating location card sits below safe area; chips sit below the card. */
const LOCATION_CARD_TOP = 12;

interface MapHomeScreenProps {
  onBookRide: () => void;
}

export const MapHomeScreen: React.FC<MapHomeScreenProps> = ({ onBookRide }) => {
  const { user, logout } = useAuthStore();
  const { activeRide, getActiveRide, driverLocation, startTracking, stopTracking, setUserLocation, setPendingLocationPick } = useRideStore();
  const [liveEta, setLiveEta] = useState<{ distance: number; duration: number } | null>(null);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // Default location (Bangalore city center)
  const [location, setLocation] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
  });
  const mapViewportCenterRef = useRef(location);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [locationName, setLocationName] = useState('Fetching location...');
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isPickingPickup, setIsPickingPickup] = useState(false);
  const [pickupMapCenter, setPickupMapCenter] = useState(location);
  const [pickupMapName, setPickupMapName] = useState('');
  const [pickupMapAddress, setPickupMapAddress] = useState('');
  const [pickupMapAddressLoading, setPickupMapAddressLoading] = useState(false);
  const [pickupMapMoving, setPickupMapMoving] = useState(false);
  const [cameraRevision, setCameraRevision] = useState(0);
  const pickupAddressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickupAddressRequestRef = useRef(0);

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
  const menuSlideAnim = useRef(new Animated.Value(-MENU_DRAWER_WIDTH)).current;

  useEffect(() => {
    getUserLocation();
    fetchRecentAndSaved();
  }, []);

  useEffect(() => () => {
    if (pickupAddressDebounceRef.current) clearTimeout(pickupAddressDebounceRef.current);
    pickupAddressRequestRef.current += 1;
  }, []);

  const resolvePickupAddress = async (latitude: number, longitude: number, requestId: number) => {
    let name = 'Selected pickup';
    let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (place) {
        name = [place.street || place.name, place.city].filter(Boolean).join(', ') || name;
        address = [place.street, place.district, place.city, place.region].filter(Boolean).join(', ') || address;
      }
    } catch {
      // Coordinates remain a valid pickup if reverse geocoding is unavailable.
    }
    if (requestId !== pickupAddressRequestRef.current) return;
    setPickupMapName(name);
    setPickupMapAddress(address);
    setPickupMapAddressLoading(false);
  };

  const beginPickupSelection = () => {
    const center = mapViewportCenterRef.current;
    setPickupMapCenter(center);
    setPickupMapName('');
    setPickupMapAddress('');
    setPickupMapMoving(false);
    setIsPickingPickup(true);
    setPickupMapAddressLoading(true);
    const requestId = ++pickupAddressRequestRef.current;
    void resolvePickupAddress(center.latitude, center.longitude, requestId);
  };

  const handlePickupMapRegionIsChanging = (feature: any) => {
    if (!feature?.properties?.isUserInteraction) return;
    pickupAddressRequestRef.current += 1;
    if (pickupAddressDebounceRef.current) clearTimeout(pickupAddressDebounceRef.current);
    setIsPickingPickup(true);
    setPickupMapMoving(true);
    setPickupMapAddressLoading(false);
  };

  const handlePickupMapRegionDidChange = (feature: any) => {
    const coordinates = feature?.geometry?.coordinates;
    const longitude = coordinates?.[0];
    const latitude = coordinates?.[1];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const center = { latitude, longitude };
    mapViewportCenterRef.current = center;
    if (!isPickingPickup) return;

    setPickupMapCenter(center);
    setPickupMapMoving(false);
    setPickupMapAddressLoading(true);
    if (pickupAddressDebounceRef.current) clearTimeout(pickupAddressDebounceRef.current);
    const requestId = ++pickupAddressRequestRef.current;
    pickupAddressDebounceRef.current = setTimeout(() => {
      void resolvePickupAddress(latitude, longitude, requestId);
    }, 300);
  };

  const cancelPickupSelection = () => {
    if (pickupAddressDebounceRef.current) clearTimeout(pickupAddressDebounceRef.current);
    pickupAddressRequestRef.current += 1;
    setIsPickingPickup(false);
    setPickupMapMoving(false);
    setCameraRevision((revision) => revision + 1);
  };

  const confirmPickupSelection = () => {
    if (pickupMapMoving) return;
    if (pickupAddressDebounceRef.current) clearTimeout(pickupAddressDebounceRef.current);
    pickupAddressRequestRef.current += 1;
    const name = pickupMapName || pickupMapAddress.split(',')[0] || 'Selected pickup';
    const address = pickupMapAddress || `${pickupMapCenter.latitude.toFixed(5)}, ${pickupMapCenter.longitude.toFixed(5)}`;
    mapViewportCenterRef.current = pickupMapCenter;
    setLocation(pickupMapCenter);
    setLocationName(name);
    setUserLocation({ ...pickupMapCenter, name, address, pickType: 'pickup' });
    setIsPickingPickup(false);
    setPickupMapAddressLoading(false);
  };

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
        setSearchingNearbyPins((prev) => {
          const next = (res.drivers || []).map((d) => ({
            id: d.id,
            latitude: d.latitude,
            longitude: d.longitude,
            category: (d as any).category || d.vehicle_type || 'mini',
            heading: (d as any).heading ?? null,
          }));
          return samePinList(prev, next) ? prev : next;
        });
      } catch {
        // Keep previous pins on soft poll failure
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
      mapViewportCenterRef.current = { latitude, longitude };
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
      const { results, error } = await searchPlaces(query, {
        proximity: { latitude: location.latitude, longitude: location.longitude },
        limit: 5,
      });
      setSearchResults(results);
      if (!results.length && error) {
        Alert.alert('Search Error', error, [{ text: 'OK' }]);
      }
    } catch (error) {
      console.error('Location search error:', error);
      Alert.alert(
        'Search Error',
        `Failed to search location.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
      setSearchResults([]);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleLocationSearchSelect = (item: { name: string; address: string; latitude: number; longitude: number }) => {
    mapViewportCenterRef.current = { latitude: item.latitude, longitude: item.longitude };
    setLocation({ latitude: item.latitude, longitude: item.longitude });
    setLocationName(item.name || item.address.split(',')[0]);
    setUserLocation({
      latitude: item.latitude,
      longitude: item.longitude,
      name: item.name || item.address.split(',')[0],
      address: item.address,
      pickType: 'pickup',
    });
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
    const toValue = menuOpen ? -MENU_DRAWER_WIDTH : 0;
    Animated.spring(menuSlideAnim, {
      toValue,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    setMenuOpen(!menuOpen);
  };

  const go = (href: string) => {
    toggleMenu();
    navigateIfNeeded(pathname, href);
  };

  const handleRideComplete = async () => {
    // Refresh to check if ride is truly complete
    await getActiveRide();
  };

  /** Prefill destination on book-ride when user taps Home / Work / recent chips. */
  const openBookWithDropoff = (place: {
    name?: string;
    address: string;
    latitude: number;
    longitude: number;
  }) => {
    setPendingLocationPick({
      latitude: place.latitude,
      longitude: place.longitude,
      name: place.name || place.address.split(',')[0] || 'Destination',
      address: place.address,
      pickType: 'dropoff',
    });
    onBookRide();
  };

  // Check if we should show active ride in bottom sheet
  const showActiveRideSheet = activeRide && ['pending', 'accepted', 'started'].includes(activeRide.status);

  const isTrackingRide = activeRide && ['pending', 'accepted', 'started'].includes(activeRide.status);

  return (
    <View style={styles.container}>
      {/* Status bar area - not touchable */}
      <View style={[styles.statusBarSpacer, { height: insets.top }]} />

      {/* Map: tracking view or normal */}
      {isTrackingRide ? (
        <RideTrackingMap
          key={String(activeRide.id)}
          rideStatus={activeRide.status as 'pending' | 'accepted' | 'started'}
          pickupLocation={{
            latitude: Number((activeRide as any).pickup_lat),
            longitude: Number((activeRide as any).pickup_lng),
          }}
          dropoffLocation={
            Number.isFinite(Number((activeRide as any).dropoff_lat)) &&
            Number.isFinite(Number((activeRide as any).dropoff_lng))
              ? {
                  latitude: Number((activeRide as any).dropoff_lat),
                  longitude: Number((activeRide as any).dropoff_lng),
                }
              : null
          }
          driverLocation={driverLocation}
          vehicleCategory={(activeRide as any).driver_vehicle_type || (activeRide as any).vehicle_category}
          nearbyPins={activeRide.status === 'pending' ? searchingNearbyPins : undefined}
          onEtaUpdate={(dist, dur) => setLiveEta({ distance: dist, duration: dur })}
        />
      ) : (
        <FleetMap
          latitude={location.latitude}
          longitude={location.longitude}
          zoom={14}
          cameraRevision={cameraRevision}
          vehicleFilter={fleetFilter}
          onVehicleFilterChange={setFleetFilter}
          onRegionIsChanging={handlePickupMapRegionIsChanging}
          onRegionDidChange={handlePickupMapRegionDidChange}
          showFilterChips={false}
        />
      )}

      {!isTrackingRide && (
        <View pointerEvents="none" style={[styles.pickupCenterOverlay, { top: insets.top }]}>
          <View style={styles.pickupCenterMarker}>
            <Ionicons name="location" size={44} color={Colors.primary} />
          </View>
        </View>
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
            onPress={isPickingPickup ? cancelPickupSelection : beginPickupSelection}
            disabled={Boolean(isTrackingRide)}
            accessibilityRole="button"
            accessibilityLabel={isPickingPickup ? 'Cancel pickup selection' : 'Adjust pickup location on map'}
          >
            <Ionicons name={isPickingPickup ? 'close' : 'map-outline'} size={22} color={Colors.primary} />
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
        <View style={[styles.menuHeader, { paddingTop: insets.top + Spacing.md }]}>
          <View style={styles.menuHeaderTop}>
            <View style={styles.menuBrand}>
              <View style={styles.menuBrandIcon}>
                <Ionicons name="car-sport" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.menuBrandName}>JK Taxi</Text>
            </View>
            <TouchableOpacity
              onPress={toggleMenu}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            >
              <Ionicons name="close" size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>
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
        </View>

        <ScrollView style={styles.menuContent} showsVerticalScrollIndicator={false}>
          {user?.ride_otp && (
            <View style={styles.menuOtpCard}>
              <View style={styles.menuOtpHeader}>
                <View style={styles.menuOtpIcon}>
                  <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
                </View>
                <View style={styles.menuOtpCopy}>
                  <Text style={styles.menuOtpLabel}>Ride security code</Text>
                  <Text style={styles.menuOtpHint}>Share with your captain to start</Text>
                </View>
              </View>
              <View style={styles.menuOtpNumberContainer}>
                <Text style={styles.menuOtpNumber}>{user.ride_otp}</Text>
              </View>
            </View>
          )}

          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Menu</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => go('/')}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="home-outline" size={21} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Home</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.inkMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => go('/rides')}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="receipt-outline" size={21} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>My Rides</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.inkMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => go('/profile')}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="person-outline" size={21} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Profile</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.inkMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => go('/ride-ui-preview')}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="play-circle-outline" size={21} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Ride Preview</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.inkMuted} />
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
          {isPickingPickup ? (
            <>
              <View style={styles.pickupSelectionRow}>
                <View style={styles.pickupSelectionIcon}>
                  {pickupMapAddressLoading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Ionicons name="location" size={20} color={Colors.primary} />
                  )}
                </View>
                <View style={styles.pickupSelectionCopy}>
                  <Text style={styles.pickupSelectionTitle}>Pickup point</Text>
                  <Text style={styles.pickupSelectionAddress} numberOfLines={2}>
                    {pickupMapMoving ? 'Move the map to adjust the pin' : pickupMapAddress || 'Finding address...'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelPickupButton}
                  onPress={cancelPickupSelection}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel pickup selection"
                >
                  <Ionicons name="close" size={22} color={Colors.inkSecondary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.pickupConfirmButton, pickupMapMoving && styles.pickupConfirmButtonDisabled]}
                onPress={confirmPickupSelection}
                disabled={pickupMapMoving}
                accessibilityRole="button"
                accessibilityLabel="Confirm pickup location"
              >
                <Text style={styles.pickupConfirmText}>Set pickup location</Text>
              </TouchableOpacity>
            </>
          ) : activeRide ? (
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
              <View style={styles.bookingHeading}><View><Text style={styles.bookingPrompt}>Where are you going?</Text><Text style={styles.bookingSubprompt}>Choose your destination to see ride options</Text></View><View style={styles.bookingBadge}><Ionicons name="car-outline" size={24} color={Colors.primary} /></View></View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fleetCategoryRow}
                style={styles.fleetCategoryScroll}
              >
                {FLEET_FILTERS.map((option) => {
                  const selected = fleetFilter === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Show ${option.label.toLowerCase()} drivers`}
                      accessibilityState={{ selected }}
                      style={[styles.fleetCategoryOption, selected && styles.fleetCategoryOptionSelected]}
                      onPress={() => setFleetFilter(option.id)}
                      activeOpacity={0.8}
                    >
                      <VehicleCategoryImage
                        type={option.id}
                        width={54}
                        height={34}
                        fallbackIcon={option.icon}
                        fallbackColor={option.color}
                        style={styles.fleetCategoryImage}
                      />
                      <Text style={[styles.fleetCategoryLabel, selected && styles.fleetCategoryLabelSelected]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Choose destination and book a ride" style={styles.searchBox} onPress={onBookRide} activeOpacity={0.85}>
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
                    <TouchableOpacity
                      style={styles.savedPlaceChip}
                      onPress={() =>
                        openBookWithDropoff({
                          name: 'Home',
                          address: savedPlaces.home!.address,
                          latitude: savedPlaces.home!.latitude,
                          longitude: savedPlaces.home!.longitude,
                        })
                      }
                    >
                      <Ionicons name="home" size={15} color={Colors.primary} />
                      <Text style={styles.savedPlaceText} numberOfLines={1}>Home</Text>
                    </TouchableOpacity>
                  )}
                  {savedPlaces.work && (
                    <TouchableOpacity
                      style={styles.savedPlaceChip}
                      onPress={() =>
                        openBookWithDropoff({
                          name: 'Work',
                          address: savedPlaces.work!.address,
                          latitude: savedPlaces.work!.latitude,
                          longitude: savedPlaces.work!.longitude,
                        })
                      }
                    >
                      <Ionicons name="briefcase" size={15} color={Colors.primary} />
                      <Text style={styles.savedPlaceText} numberOfLines={1}>Work</Text>
                    </TouchableOpacity>
                  )}
                  {recentDropoffs.slice(0, 4).map((item, index) => (
                    <TouchableOpacity
                      key={`${item.latitude}-${index}`}
                      style={styles.recentChip}
                      onPress={() => openBookWithDropoff(item)}
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
                      onPress={() => openBookWithDropoff(item)}
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
    width: MENU_DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10000,
  },
  menuHeader: {
    backgroundColor: Colors.primary,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  menuHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    marginBottom: Spacing.lg,
  },
  menuBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  menuBrandIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  menuBrandName: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  menuHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  menuUserName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    marginBottom: 4,
  },
  menuUserPhone: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.76)',
  },
  menuContent: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  menuOtpCard: {
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuOtpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  menuOtpIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: Colors.primarySoft,
  },
  menuOtpCopy: { flex: 1 },
  menuOtpHint: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  menuOtpLabel: {
    fontSize: FontSizes.sm,
    color: Colors.ink,
    fontWeight: FontWeights.semibold,
  },
  menuOtpNumberContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.primarySoft,
  },
  menuOtpNumber: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    letterSpacing: 6,
  },
  menuSection: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  menuSectionTitle: {
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuItemText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.ink,
    fontWeight: FontWeights.semibold,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
    backgroundColor: '#FFF7F7',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutButtonText: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSizes.sm,
    color: Colors.error,
    fontWeight: FontWeights.semibold,
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
  pickupCenterOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  pickupCenterMarker: {
    marginTop: -42,
  },
  pickupSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    minHeight: 48,
  },
  pickupSelectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  pickupSelectionCopy: {
    flex: 1,
  },
  pickupSelectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.inkSecondary,
    marginBottom: 2,
  },
  pickupSelectionAddress: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.ink,
  },
  cancelPickupButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupConfirmButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  pickupConfirmButtonDisabled: {
    opacity: 0.55,
  },
  pickupConfirmText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
  bookingHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  bookingBadge: { width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.primarySoft, alignItems: "center", justifyContent: "center" },
  fleetCategoryScroll: {
    maxHeight: 66,
    marginBottom: Spacing.sm,
  },
  fleetCategoryRow: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: 1,
  },
  fleetCategoryOption: {
    width: 58,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  fleetCategoryOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  fleetCategoryImage: {
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  fleetCategoryLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: FontWeights.medium,
    color: Colors.textSecondary,
  },
  fleetCategoryLabelSelected: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
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
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    marginBottom: 10,
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
