import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { formatApiError } from '../src/utils/apiError';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { LocationSearchInput, LocationResult, LocationSearchInputRef } from '../src/components/map/LocationSearchInput';
import { VehicleCategoryImage } from '../src/components/ride/VehicleCategoryImage';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';
import { bookingEnhancedApi, userEnhancedApi } from '../src/api/booking-enhanced';
import { VehicleCategory, TripType, FareBreakdown, RidePreferences, StopLocation, SavedPlaces } from '../src/types/enhanced';
import { useRideStore } from '../src/store/rideStore';
import { MAPBOX_ACCESS_TOKEN } from '../src/config/mapbox-config';
import { serviceAreaError } from '../src/utils/serviceArea';

const TRIP_TYPES = [
  { type: TripType.ONE_WAY, label: 'One Way', icon: 'arrow-forward' },
  { type: TripType.ROUND_TRIP, label: 'Round Trip', icon: 'swap-horizontal' },
  { type: TripType.RENTAL, label: 'Rental', icon: 'time' },
  { type: TripType.OUTSTATION, label: 'Outstation', icon: 'car-sport' },
];

/** Uber/Ola-style hourly packages — 10 km included per hour. */
const RENTAL_PACKAGES = [
  { hours: 1, km: 10, label: '1 hour' },
  { hours: 2, km: 20, label: '2 hours' },
  { hours: 4, km: 40, label: '4 hours' },
  { hours: 8, km: 80, label: '8 hours' },
] as const;

/** Market package ₹/hr (India rentals, 2026) — used if API hourly_rate missing. */
const MARKET_HOURLY: Record<string, number> = {
  bike: 129,
  auto: 149,
  mini: 189,
  sedan: 249,
  suv: 399,
};

const VEHICLE_FALLBACK = [
  { type: VehicleCategory.MINI, name: 'Mini', icon: 'car-outline', capacity: '4 seats', examples: 'WagonR, Alto', color: '#4CAF50', hourly_rate: 189 },
  { type: VehicleCategory.SEDAN, name: 'Sedan', icon: 'car-sport-outline', capacity: '4 seats', examples: 'Dzire, Etios', color: '#2196F3', hourly_rate: 249 },
  { type: VehicleCategory.SUV, name: 'SUV', icon: 'car', capacity: '6-7 seats', examples: 'Ertiga, Innova', color: '#FF9800', hourly_rate: 399 },
  { type: VehicleCategory.AUTO, name: 'Auto', icon: 'bus', capacity: '3 seats', examples: 'Auto rickshaw', color: '#EAB308', hourly_rate: 149 },
  { type: VehicleCategory.BIKE, name: 'Bike', icon: 'bicycle', capacity: '1 seat', examples: 'Activa, Pulsar', color: '#F97316', hourly_rate: 129 },
];

const VEHICLE_DISPLAY_ORDER = ['mini', 'sedan', 'suv', 'auto', 'bike'] as const;

const VEHICLE_META: Record<string, { icon: string; color: string }> = {
  bike: { icon: 'bicycle', color: '#F97316' },
  auto: { icon: 'bus', color: '#EAB308' },
  mini: { icon: 'car-outline', color: '#4CAF50' },
  sedan: { icon: 'car-sport-outline', color: '#2196F3' },
  suv: { icon: 'car', color: '#FF9800' },
};

type VehicleOption = {
  type: VehicleCategory | string;
  name: string;
  icon: string;
  capacity: string;
  examples: string;
  color: string;
  base_fare?: number;
  per_km_rate?: number;
  hourly_rate?: number;
};

export default function BookRideScreen() {
  const { getActiveRide, userLocation, pendingLocationPick, setPendingLocationPick } = useRideStore();
  const insets = useSafeAreaInsets();

  // Locations
  const [pickupLocation, setPickupLocation] = useState<LocationResult | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<LocationResult | null>(null);
  const dropoffInputRef = useRef<LocationSearchInputRef>(null);

  // Vehicle & Fare
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategory>(VehicleCategory.MINI);
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>(VEHICLE_FALLBACK);
  const [fares, setFares] = useState<Record<string, number>>({});
  const [calculatingFares, setCalculatingFares] = useState(false);
  const [fareBreakdown, setFareBreakdown] = useState<FareBreakdown | null>(null);

  // Options (defaults applied if not changed)
  const [tripType, setTripType] = useState<TripType>(TripType.ONE_WAY);
  const [rentalHours, setRentalHours] = useState(1);
  const [rideNow, setRideNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [bookingForSelf, setBookingForSelf] = useState(true);
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [preferences, setPreferences] = useState<RidePreferences>({
    ac_preferred: false, pet_friendly: false, silent_ride: false,
    extra_luggage: false, wheelchair_support: false, women_driver: false,
  });
  const [driverNotes, setDriverNotes] = useState('');

  // UI state
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentDropoffs, setRecentDropoffs] = useState<LocationResult[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlaces>({});

  const [fareError, setFareError] = useState<string | null>(null);

  // Step: 'locations' | 'vehicle' | 'confirm'
  const step = !pickupLocation || !dropoffLocation ? 'locations' : 'vehicle';

  useEffect(() => {
    // Use stored location from home screen if available
    if (userLocation) {
      setPickupLocation(userLocation);
    } else {
      autoFetchPickup();
    }
    fetchRecentLocations();
    loadVehicleCategories();
  }, []);

  const loadVehicleCategories = async () => {
    try {
      const cats = await bookingEnhancedApi.getVehicleCategories();
      if (!cats?.length) return;
      const mapped: VehicleOption[] = cats
        .filter((c) => c.name !== 'premium' && c.is_active !== false)
        .map((c) => {
        const meta = VEHICLE_META[c.name] || { icon: c.icon_name || 'car-outline', color: '#64748B' };
        const examples = (c.example_vehicles || []).slice(0, 3).join(', ') || c.display_name;
        return {
          type: c.name,
          name: c.display_name,
          icon: meta.icon,
          color: meta.color,
          capacity: `${c.seater_capacity} seat${c.seater_capacity === 1 ? '' : 's'}`,
          examples,
          base_fare: c.base_fare,
          per_km_rate: c.per_km_rate,
          hourly_rate: c.hourly_rate,
        };
      })
        .sort((a, b) => {
          const ai = VEHICLE_DISPLAY_ORDER.indexOf(String(a.type) as (typeof VEHICLE_DISPLAY_ORDER)[number]);
          const bi = VEHICLE_DISPLAY_ORDER.indexOf(String(b.type) as (typeof VEHICLE_DISPLAY_ORDER)[number]);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });
      setVehicleOptions(mapped);
      if (!mapped.find((v) => v.type === selectedVehicle) && mapped[0]) {
        setSelectedVehicle(mapped[0].type as VehicleCategory);
      }
    } catch {
      // Keep fallback list if API unavailable
    }
  };

  // Listen for location picked from map (pickType survives remount via store)
  useEffect(() => {
    if (!pendingLocationPick) return;
    const pick = pendingLocationPick;
    if (pick.pickType === 'dropoff') {
      setDropoffLocation(pick);
    } else {
      setPickupLocation(pick);
    }
    setPendingLocationPick(null);
  }, [pendingLocationPick]);

  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      calculateAllFares();
    }
  }, [pickupLocation, dropoffLocation, tripType, vehicleOptions, rentalHours]);

  useEffect(() => {
    if (pickupLocation && dropoffLocation && selectedVehicle) {
      fetchFareBreakdown();
    }
  }, [selectedVehicle, pickupLocation, dropoffLocation, tripType, rentalHours]);

  useEffect(() => {
    if (tripType === TripType.RENTAL && String(selectedVehicle) === 'bike') {
      const first = vehicleOptions.find((v) => String(v.type) !== 'bike');
      if (first) setSelectedVehicle(first.type as VehicleCategory);
    }
  }, [tripType, selectedVehicle, vehicleOptions]);

  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const estimateLocalFare = (
    vehicle: VehicleOption,
    distanceKm: number,
    trip: TripType
  ): FareBreakdown => {
    const base = Number(vehicle.base_fare ?? 100);
    const perKm = Number(vehicle.per_km_rate ?? 20);
    const hourly = Number(vehicle.hourly_rate ?? 280);
    const platform = 40;
    const roadKm = Math.max(1, distanceKm * 1.25); // rough road factor

    let baseFare = base;
    let distanceFare = roadKm * perKm;
    let platformFee = platform;
    let billedKm = roadKm;

    if (trip === TripType.RENTAL) {
      const hours = Math.max(1, rentalHours || 1);
      const hourlyRate =
        Number(vehicle.hourly_rate) ||
        MARKET_HOURLY[String(vehicle.type)] ||
        189;
      // GST-inclusive market package (matches backend rental calc)
      const packageTotal = hourlyRate * hours;
      billedKm = 10 * hours;
      baseFare = Math.round((packageTotal / 1.05) * 100) / 100;
      distanceFare = 0;
      platformFee = 0;
      const gst = Math.round((packageTotal - baseFare) * 100) / 100;
      return {
        base_fare: baseFare,
        distance_fare: 0,
        platform_fee: 0,
        gst,
        toll_charges: 0,
        night_charges: 0,
        waiting_charges: 0,
        total: packageTotal,
        distance_km: billedKm,
        duration_minutes: hours * 60,
        route_source: 'estimate',
      };
    } else if (trip === TripType.ROUND_TRIP) {
      // Exact 2× one-way (outbound + return)
      billedKm = roadKm * 2;
      baseFare = base * 2;
      distanceFare = billedKm * perKm;
      platformFee = platform * 2;
    } else if (trip === TripType.OUTSTATION) {
      distanceFare = roadKm * perKm * 1.5;
    }

    const subtotal = baseFare + distanceFare + platformFee;
    const gst = subtotal * 0.05;
    const total = subtotal + gst;

    return {
      base_fare: Math.round(baseFare * 100) / 100,
      distance_fare: Math.round(distanceFare * 100) / 100,
      platform_fee: platformFee,
      gst: Math.round(gst * 100) / 100,
      toll_charges: 0,
      night_charges: 0,
      waiting_charges: 0,
      total: Math.round(total * 100) / 100,
      distance_km: Math.round(billedKm * 100) / 100,
      duration_minutes: Math.round((billedKm / 25) * 60 * 10) / 10,
      route_source: 'estimate',
    };
  };

  const autoFetchPickup = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // Use last known position first (instant), fallback to fresh GPS
      let loc = await Location.getLastKnownPositionAsync();
      if (!loc) {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      }
      if (!loc) return;

      const { latitude, longitude } = loc.coords;

      // Set immediately with generic name while reverse geocode loads
      setPickupLocation({ name: 'Current Location', address: 'Fetching address...', latitude, longitude });

      // Then reverse geocode in background
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.features?.[0]) {
          setPickupLocation({
            name: data.features[0].text,
            address: data.features[0].place_name,
            latitude,
            longitude,
          });
        }
      } catch {}
    } catch {}
  };

  const fetchRecentLocations = async () => {
    try {
      const [history, places] = await Promise.all([
        bookingEnhancedApi.getRideHistory().catch(() => []),
        userEnhancedApi.getSavedPlaces().catch(() => ({})),
      ]);
      if (places) setSavedPlaces(places);
      if (history?.length) {
        const seen = new Set<string>();
        const recent: LocationResult[] = [];
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

  const calculateAllFares = async () => {
    if (!pickupLocation || !dropoffLocation) return;
    setCalculatingFares(true);
    setFareError(null);
    const distanceKm = haversineKm(
      pickupLocation.latitude,
      pickupLocation.longitude,
      dropoffLocation.latitude,
      dropoffLocation.longitude
    );
    const newFares: Record<string, number> = {};
    let apiFailures = 0;
    let firstDetail: string | null = null;

    try {
      await Promise.all(
        vehicleOptions.map(async (v) => {
          try {
            const fare = await bookingEnhancedApi.calculateFare({
              pickup_lat: pickupLocation.latitude,
              pickup_lng: pickupLocation.longitude,
              dropoff_lat: dropoffLocation.latitude,
              dropoff_lng: dropoffLocation.longitude,
              vehicle_category: String(v.type),
              trip_type: tripType,
              rental_hours: tripType === TripType.RENTAL ? rentalHours : undefined,
            });
            newFares[v.type] = fare.total;
          } catch (err: any) {
            apiFailures += 1;
            const detail = err?.response?.data?.detail;
            if (typeof detail === 'string' && !firstDetail) firstDetail = detail;
            const local = estimateLocalFare(v, distanceKm, tripType);
            newFares[v.type] = local.total;
          }
        })
      );
      setFares(newFares);
      if (apiFailures === vehicleOptions.length) {
        setFareError(firstDetail || 'Showing estimated fares (server unavailable)');
      } else if (apiFailures > 0) {
        setFareError(firstDetail || 'Some fares estimated locally');
      } else {
        setFareError(null);
      }
    } finally {
      setCalculatingFares(false);
    }
  };

  const fetchFareBreakdown = async () => {
    if (!pickupLocation || !dropoffLocation) return;
    const vehicle =
      vehicleOptions.find((v) => v.type === selectedVehicle) ||
      VEHICLE_FALLBACK.find((v) => v.type === selectedVehicle) ||
      vehicleOptions[0];
    const distanceKm = haversineKm(
      pickupLocation.latitude,
      pickupLocation.longitude,
      dropoffLocation.latitude,
      dropoffLocation.longitude
    );

    try {
      const fare = await bookingEnhancedApi.calculateFare({
        pickup_lat: pickupLocation.latitude,
        pickup_lng: pickupLocation.longitude,
        dropoff_lat: dropoffLocation.latitude,
        dropoff_lng: dropoffLocation.longitude,
        vehicle_category: String(selectedVehicle),
        trip_type: tripType,
        rental_hours: tripType === TripType.RENTAL ? rentalHours : undefined,
      });
      setFareBreakdown(fare);
    } catch (err: any) {
      if (vehicle) {
        setFareBreakdown(estimateLocalFare(vehicle, distanceKm, tripType));
      }
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') setFareError(detail);
    }
  };

  const handleBookRide = async () => {
    if (!pickupLocation || !dropoffLocation) {
      Alert.alert('Missing Info', 'Please select pickup and dropoff locations');
      return;
    }

    const pickupErr = serviceAreaError(pickupLocation.latitude, pickupLocation.longitude, 'Pickup');
    if (pickupErr) {
      Alert.alert('Outside Service Area', pickupErr);
      return;
    }
    const dropErr = serviceAreaError(dropoffLocation.latitude, dropoffLocation.longitude, 'Dropoff');
    if (dropErr) {
      Alert.alert('Outside Service Area', dropErr);
      return;
    }

    try {
      setLoading(true);

      const bookingData: any = {
        trip_type: tripType,
        vehicle_category: selectedVehicle,
        pickup_location: pickupLocation.address,
        pickup_lat: pickupLocation.latitude,
        pickup_lng: pickupLocation.longitude,
        dropoff_location: dropoffLocation.address,
        dropoff_lat: dropoffLocation.latitude,
        dropoff_lng: dropoffLocation.longitude,
        is_scheduled: !rideNow,
        scheduled_datetime: (!rideNow && scheduledDate && scheduledTime)
          ? `${scheduledDate}T${scheduledTime}:00` : undefined,
        booking_for_self: bookingForSelf,
        passenger_name: bookingForSelf ? undefined : passengerName,
        passenger_phone: bookingForSelf ? undefined : passengerPhone,
        preferences,
        driver_notes: driverNotes || undefined,
        payment_method: paymentMethod,
        stops: [],
        ...(tripType === TripType.RENTAL ? { rental_hours: rentalHours } : {}),
      };

      const ride = await bookingEnhancedApi.createBooking(bookingData);
      await getActiveRide();

      Alert.alert(
        'Ride Booked!',
        `Your ${vehicleOptions.find(v => v.type === selectedVehicle)?.name || selectedVehicle} is on the way.\n\nShare your OTP with the driver to start the ride.`,
        [{ text: 'Track Ride', onPress: () => router.replace('/') }]
      );
    } catch (error: any) {
      Alert.alert('Booking Failed', formatApiError(error, 'Failed to book ride'));
    } finally {
      setLoading(false);
    }
  };

  const renderLocationsStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.locationContainer}>
        <View style={styles.locationDots}>
          <View style={styles.pickupDot} />
          <View style={styles.dashedLine} />
          <View style={styles.dropoffDot} />
        </View>
        <View style={styles.locationInputs}>
          <LocationSearchInput
            placeholder="Pickup location"
            icon="radio-button-on"
            onLocationSelect={setPickupLocation}
            initialValue={pickupLocation?.address}
            onFocusNext={() => dropoffInputRef.current?.focus()}
            showCurrentLocation={true}
          />
          {pickupLocation && (
            <Text style={styles.helperText}>
              <Ionicons name="information-circle-outline" size={12} color="#999" /> Tap GPS icon to refresh location
            </Text>
          )}
          <View style={{ height: 12 }} />
          <LocationSearchInput
            ref={dropoffInputRef}
            placeholder="Where are you going?"
            icon="location"
            onLocationSelect={setDropoffLocation}
            initialValue={dropoffLocation?.address}
          />
        </View>
      </View>

      {/* Pick/Drop on Map buttons */}
      <View style={styles.pickOnMapContainer}>
        <TouchableOpacity
          style={styles.pickOnMapBtn}
          onPress={() => {
            router.push({
              pathname: '/pick-on-map',
              params: {
                type: 'pickup',
                lat: pickupLocation?.latitude.toString(),
                lng: pickupLocation?.longitude.toString(),
              }
            });
          }}
        >
          <Ionicons name="map" size={18} color={Colors.primary} />
          <Text style={styles.pickOnMapText}>Pick Pickup on Map</Text>
        </TouchableOpacity>

        {pickupLocation && (
          <TouchableOpacity
            style={[styles.pickOnMapBtn, { backgroundColor: '#FFF5F5', borderColor: '#F44336' + '30' }]}
            onPress={() => {
              router.push({
                pathname: '/pick-on-map',
                params: {
                  type: 'dropoff',
                  lat: dropoffLocation?.latitude.toString() || pickupLocation.latitude.toString(),
                  lng: dropoffLocation?.longitude.toString() || pickupLocation.longitude.toString(),
                }
              });
            }}
          >
            <Ionicons name="location" size={18} color="#F44336" />
            <Text style={[styles.pickOnMapText, { color: '#F44336' }]}>Pick Drop on Map</Text>
          </TouchableOpacity>
        )}
      </View>

      {!dropoffLocation && (
        <>
          {(savedPlaces.home || savedPlaces.work) && (
            <View style={styles.suggestedSection}>
              <Text style={styles.suggestedTitle}>Saved Places</Text>
              {savedPlaces.home && (
                <TouchableOpacity style={styles.suggestedItem} onPress={() => setDropoffLocation({
                  name: 'Home', address: savedPlaces.home!.address,
                  latitude: savedPlaces.home!.latitude, longitude: savedPlaces.home!.longitude,
                })}>
                  <View style={[styles.suggestedIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="home" size={18} color="#4CAF50" />
                  </View>
                  <View style={styles.suggestedText}>
                    <Text style={styles.suggestedName}>Home</Text>
                    <Text style={styles.suggestedAddr} numberOfLines={1}>{savedPlaces.home.address}</Text>
                  </View>
                </TouchableOpacity>
              )}
              {savedPlaces.work && (
                <TouchableOpacity style={styles.suggestedItem} onPress={() => setDropoffLocation({
                  name: 'Work', address: savedPlaces.work!.address,
                  latitude: savedPlaces.work!.latitude, longitude: savedPlaces.work!.longitude,
                })}>
                  <View style={[styles.suggestedIcon, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="briefcase" size={18} color="#2196F3" />
                  </View>
                  <View style={styles.suggestedText}>
                    <Text style={styles.suggestedName}>Work</Text>
                    <Text style={styles.suggestedAddr} numberOfLines={1}>{savedPlaces.work.address}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {recentDropoffs.length > 0 && (
            <View style={styles.suggestedSection}>
              <Text style={styles.suggestedTitle}>Recent</Text>
              {recentDropoffs.map((item, i) => (
                <TouchableOpacity key={`${item.latitude}-${i}`} style={styles.suggestedItem}
                  onPress={() => setDropoffLocation(item)}>
                  <View style={styles.suggestedIcon}>
                    <Ionicons name="time-outline" size={18} color="#666" />
                  </View>
                  <View style={styles.suggestedText}>
                    <Text style={styles.suggestedName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.suggestedAddr} numberOfLines={1}>{item.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  const renderVehicleStep = () => (
    <View style={styles.content}>
      {/* Trip type chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tripTypeScroll} contentContainerStyle={styles.tripTypeContainer}>
        {TRIP_TYPES.map((t) => (
          <TouchableOpacity
            key={t.type}
            style={[styles.tripTypeChip, tripType === t.type && styles.tripTypeChipActive]}
            onPress={() => setTripType(t.type)}
          >
            <Ionicons name={t.icon as any} size={14} color={tripType === t.type ? '#FFF' : '#666'} />
            <Text style={[styles.tripTypeChipText, tripType === t.type && styles.tripTypeChipTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Vehicle list */}
      {fareError ? (
        <View style={styles.fareErrorBanner}>
          <Ionicons name="information-circle-outline" size={16} color="#B45309" />
          <Text style={styles.fareErrorText}>{fareError}</Text>
        </View>
      ) : null}
      <ScrollView style={styles.vehicleList} showsVerticalScrollIndicator={false}>
        {tripType === TripType.RENTAL ? (
          <Text style={styles.rentalHint}>
            Pick a package under each vehicle · ~10 km included per hour (Uber/Ola style)
          </Text>
        ) : null}
        {(tripType === TripType.RENTAL
          ? vehicleOptions.filter((v) => String(v.type) !== 'bike')
          : vehicleOptions
        ).map((v) => {
          const hourly =
            Number(v.hourly_rate) || MARKET_HOURLY[String(v.type)] || 189;
          const selected = selectedVehicle === v.type;
          return (
            <View
              key={v.type}
              style={[styles.vehicleCard, selected && styles.vehicleCardSelected]}
            >
              <TouchableOpacity
                style={styles.vehicleCardHeader}
                onPress={() => {
                  setSelectedVehicle(v.type as VehicleCategory);
                  if (tripType !== TripType.RENTAL) return;
                }}
                activeOpacity={0.85}
              >
                <VehicleCategoryImage
                  type={String(v.type)}
                  fallbackIcon={v.icon}
                  fallbackColor={v.color}
                />
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>{v.name}</Text>
                  <Text style={styles.vehicleMeta}>
                    {v.capacity} • {v.examples}
                    {tripType === TripType.RENTAL
                      ? ` • ₹${Math.round(hourly)}/hr`
                      : typeof v.base_fare === 'number'
                        ? ` • Base ₹${Math.round(v.base_fare)}`
                        : ''}
                    {tripType !== TripType.RENTAL && typeof v.per_km_rate === 'number'
                      ? ` + ₹${v.per_km_rate}/km`
                      : ''}
                  </Text>
                </View>
                {tripType !== TripType.RENTAL ? (
                  <View style={styles.vehiclePrice}>
                    {calculatingFares ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : fares[v.type] ? (
                      <Text
                        style={[
                          styles.vehiclePriceText,
                          selected && styles.vehiclePriceActive,
                        ]}
                      >
                        ₹{Math.round(fares[v.type])}
                      </Text>
                    ) : (
                      <Text style={styles.vehiclePriceDash}>-</Text>
                    )}
                  </View>
                ) : null}
              </TouchableOpacity>

              {tripType === TripType.RENTAL ? (
                <View style={styles.rentalPackages}>
                  {RENTAL_PACKAGES.map((pkg) => {
                    const price = Math.round(hourly * pkg.hours);
                    const active = selected && rentalHours === pkg.hours;
                    return (
                      <TouchableOpacity
                        key={`${v.type}-${pkg.hours}`}
                        style={[styles.rentalPkgRow, active && styles.rentalPkgRowActive]}
                        onPress={() => {
                          setSelectedVehicle(v.type as VehicleCategory);
                          setRentalHours(pkg.hours);
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={styles.rentalPkgLeft}>
                          <View style={[styles.rentalRadio, active && styles.rentalRadioActive]}>
                            {active ? <View style={styles.rentalRadioDot} /> : null}
                          </View>
                          <View>
                            <Text style={[styles.rentalPkgTitle, active && styles.rentalPkgTitleActive]}>
                              {pkg.label}
                            </Text>
                            <Text style={styles.rentalPkgSub}>{pkg.km} km included</Text>
                          </View>
                        </View>
                        <Text style={[styles.rentalPkgPrice, active && styles.rentalPkgPriceActive]}>
                          ₹{price}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}

        <View style={{ height: 220 }} />
      </ScrollView>

      {/* Bottom bar: ETA + options + book — always visible */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 16 }]}>
        <View style={styles.etaBar}>
          <View style={styles.etaBarLeft}>
            <Ionicons name="navigate" size={16} color={Colors.primary} />
            <Text style={styles.etaBarText}>
              {tripType === TripType.RENTAL
                ? `${rentalHours} hr package · ${rentalHours * 10} km included`
                : fareBreakdown?.distance_km
                  ? `${fareBreakdown.distance_km.toFixed(1)} km · ~${
                      fareBreakdown.duration_minutes
                        ? Math.max(1, Math.ceil(fareBreakdown.duration_minutes))
                        : Math.max(1, Math.ceil(fareBreakdown.distance_km * 2.5))
                    } min`
                  : calculatingFares
                    ? 'Calculating route…'
                    : 'Select a vehicle'}
            </Text>
          </View>
          {(tripType === TripType.RENTAL || !!fareBreakdown?.distance_km) && (
            <Text style={styles.etaBarFare}>
              ₹{Math.round(
                tripType === TripType.RENTAL
                  ? (Number(
                      vehicleOptions.find((x) => x.type === selectedVehicle)?.hourly_rate
                    ) ||
                      MARKET_HOURLY[String(selectedVehicle)] ||
                      189) * rentalHours
                  : fareBreakdown?.total || 0
              )}
            </Text>
          )}
        </View>

        {/* Option icons row */}
        <View style={styles.optionsRow}>
          <TouchableOpacity style={[styles.optionChip, !rideNow && styles.optionChipActive]}
            onPress={() => setShowOptions(true)}>
            <Ionicons name="time-outline" size={16} color={!rideNow ? Colors.primary : '#666'} />
            <Text style={[styles.optionChipText, !rideNow && styles.optionChipTextActive]}>
              {rideNow ? 'Now' : 'Scheduled'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionChip, !bookingForSelf && styles.optionChipActive]}
            onPress={() => setShowOptions(true)}>
            <Ionicons name="person-outline" size={16} color={!bookingForSelf ? Colors.primary : '#666'} />
            <Text style={[styles.optionChipText, !bookingForSelf && styles.optionChipTextActive]}>
              {bookingForSelf ? 'For me' : 'Others'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionChip} onPress={() => setShowOptions(true)}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.optionChipText}>{paymentMethod === 'cash' ? 'Cash' : paymentMethod.toUpperCase()}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionChip} onPress={() => setShowOptions(true)}>
            <Ionicons name="options-outline" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Book button */}
        <TouchableOpacity
          style={[styles.bookButton, loading && styles.bookButtonDisabled]}
          onPress={handleBookRide}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.bookButtonText}>
              Book JK Taxi • ₹{fareBreakdown ? Math.round(fareBreakdown.total) : '--'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Options modal */}
      <Modal visible={showOptions} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowOptions(false)}>
        <SafeAreaView style={styles.optionsModal}>
          <View style={styles.optionsHeader}>
            <Text style={styles.optionsTitle}>Ride Options</Text>
            <TouchableOpacity onPress={() => setShowOptions(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.optionsContent} showsVerticalScrollIndicator={false}>
            {/* Schedule */}
            <View style={styles.optionSection}>
              <Text style={styles.optionSectionTitle}>When</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggleBtn, rideNow && styles.toggleBtnActive]}
                  onPress={() => setRideNow(true)}>
                  <Text style={[styles.toggleText, rideNow && styles.toggleTextActive]}>Now</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, !rideNow && styles.toggleBtnActive]}
                  onPress={() => setRideNow(false)}>
                  <Text style={[styles.toggleText, !rideNow && styles.toggleTextActive]}>Schedule</Text>
                </TouchableOpacity>
              </View>
              {!rideNow && (
                <View style={styles.scheduleInputs}>
                  <TextInput style={styles.optionInput} placeholder="YYYY-MM-DD" placeholderTextColor="#999"
                    value={scheduledDate} onChangeText={setScheduledDate} />
                  <TextInput style={styles.optionInput} placeholder="HH:MM (24hr)" placeholderTextColor="#999"
                    value={scheduledTime} onChangeText={setScheduledTime} />
                </View>
              )}
            </View>

            {/* Booking for */}
            <View style={styles.optionSection}>
              <Text style={styles.optionSectionTitle}>Booking For</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggleBtn, bookingForSelf && styles.toggleBtnActive]}
                  onPress={() => setBookingForSelf(true)}>
                  <Text style={[styles.toggleText, bookingForSelf && styles.toggleTextActive]}>Myself</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, !bookingForSelf && styles.toggleBtnActive]}
                  onPress={() => setBookingForSelf(false)}>
                  <Text style={[styles.toggleText, !bookingForSelf && styles.toggleTextActive]}>Someone else</Text>
                </TouchableOpacity>
              </View>
              {!bookingForSelf && (
                <View style={styles.scheduleInputs}>
                  <TextInput style={styles.optionInput} placeholder="Passenger Name" placeholderTextColor="#999"
                    value={passengerName} onChangeText={setPassengerName} />
                  <TextInput style={styles.optionInput} placeholder="Passenger Phone" placeholderTextColor="#999"
                    keyboardType="phone-pad" value={passengerPhone} onChangeText={setPassengerPhone} />
                </View>
              )}
            </View>

            {/* Payment */}
            <View style={styles.optionSection}>
              <Text style={styles.optionSectionTitle}>Payment</Text>
              <View style={styles.paymentRow}>
                {['cash', 'upi', 'card'].map((m) => (
                  <TouchableOpacity key={m} style={[styles.paymentChip, paymentMethod === m && styles.paymentChipActive]}
                    onPress={() => setPaymentMethod(m)}>
                    <Ionicons name={m === 'cash' ? 'cash' : m === 'upi' ? 'phone-portrait' : 'card'} size={18}
                      color={paymentMethod === m ? Colors.primary : '#666'} />
                    <Text style={[styles.paymentChipText, paymentMethod === m && styles.paymentChipTextActive]}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preferences */}
            <View style={styles.optionSection}>
              <Text style={styles.optionSectionTitle}>Preferences</Text>
              {[
                { key: 'women_driver', label: 'Women Captain', icon: 'woman' },
                { key: 'ac_preferred', label: 'AC Preferred', icon: 'snow' },
                { key: 'pet_friendly', label: 'Pet Friendly', icon: 'paw' },
                { key: 'silent_ride', label: 'Silent Ride', icon: 'volume-mute' },
                { key: 'extra_luggage', label: 'Extra Luggage', icon: 'bag-handle' },
                { key: 'wheelchair_support', label: 'Wheelchair', icon: 'accessibility' },
              ].map((p) => (
                <TouchableOpacity key={p.key} style={styles.prefItem}
                  onPress={() => setPreferences({ ...preferences, [p.key]: !preferences[p.key as keyof RidePreferences] })}>
                  <Ionicons name={p.icon as any} size={18} color="#666" />
                  <Text style={styles.prefLabel}>{p.label}</Text>
                  <View style={[styles.prefCheck, preferences[p.key as keyof RidePreferences] && styles.prefCheckActive]}>
                    {preferences[p.key as keyof RidePreferences] && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Driver notes */}
            <View style={styles.optionSection}>
              <Text style={styles.optionSectionTitle}>Note to Driver</Text>
              <TextInput style={[styles.optionInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="e.g., Near temple gate, Call on arrival"
                placeholderTextColor="#999" multiline value={driverNotes} onChangeText={setDriverNotes} />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={[styles.optionsDoneBar, { paddingBottom: insets.bottom || 16 }]}>
            <TouchableOpacity style={styles.doneButton} onPress={() => setShowOptions(false)}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        {step === 'locations' ? (
          <Text style={styles.headerTitle}>Where to?</Text>
        ) : (
          <TouchableOpacity style={styles.headerLocationSummary} onPress={() => { setDropoffLocation(null); }}>
            <View style={styles.headerLocRow}>
              <View style={[styles.headerDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.headerLocText} numberOfLines={1}>{pickupLocation?.name}</Text>
            </View>
            <View style={styles.headerLocRow}>
              <View style={[styles.headerDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.headerLocText} numberOfLines={1}>{dropoffLocation?.name}</Text>
            </View>
            {!!fareBreakdown?.distance_km && (
              <Text style={styles.headerEtaText}>
                {fareBreakdown.distance_km.toFixed(1)} km · ~
                {fareBreakdown.duration_minutes
                  ? Math.max(1, Math.ceil(fareBreakdown.duration_minutes))
                  : Math.max(1, Math.ceil(fareBreakdown.distance_km * 2.5))}{' '}
                min
              </Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{ width: 40 }} />
      </View>

      {step === 'locations' ? renderLocationsStep() : renderVehicleStep()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: '#000', textAlign: 'center' },
  headerLocationSummary: { flex: 1, marginLeft: Spacing.sm },
  headerLocRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  headerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  headerLocText: { fontSize: FontSizes.sm, color: '#333', flex: 1 },
  headerEtaText: {
    marginTop: 4,
    marginLeft: 16,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },

  content: { flex: 1 },

  // Locations step
  locationContainer: { flexDirection: 'row', padding: Spacing.md, backgroundColor: '#FFF', marginBottom: Spacing.sm },
  locationDots: { width: 24, alignItems: 'center', paddingTop: 20, paddingBottom: 20 },
  pickupDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50' },
  dashedLine: { width: 2, flex: 1, minHeight: 30, backgroundColor: '#E0E0E0', marginVertical: 6 },
  dropoffDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#F44336' },
  locationInputs: { flex: 1, marginLeft: Spacing.sm },
  helperText: { fontSize: 11, color: '#999', marginTop: 4, marginLeft: 2 },

  pickOnMapContainer: { paddingHorizontal: Spacing.md, marginTop: Spacing.xs, gap: 8 },
  pickOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F5FF',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    gap: 6,
  },
  pickOnMapText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },

  suggestedSection: { marginHorizontal: Spacing.md, marginTop: Spacing.sm, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.md },
  suggestedTitle: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  suggestedItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  suggestedIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  suggestedText: { flex: 1 },
  suggestedName: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: '#000' },
  suggestedAddr: { fontSize: FontSizes.sm, color: '#666', marginTop: 1 },

  // Trip type chips
  tripTypeScroll: { maxHeight: 44, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tripTypeContainer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 8 },
  tripTypeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F5F5F5', gap: 4 },
  tripTypeChipActive: { backgroundColor: Colors.primary },
  tripTypeChipText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, color: '#666' },
  tripTypeChipTextActive: { color: '#FFF' },

  // Vehicle list
  vehicleList: { flex: 1, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  fareErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  fareErrorText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: '#92400E',
    fontWeight: FontWeights.medium,
  },
  vehicleCard: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  vehicleCardSelected: { borderColor: Colors.primary, backgroundColor: '#FAFBFF' },
  vehicleCardHeader: { flexDirection: 'row', alignItems: 'center' },
  vehicleInfo: { flex: 1, marginLeft: Spacing.md },
  vehicleName: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: '#000' },
  vehicleMeta: { fontSize: FontSizes.xs, color: '#666', marginTop: 2 },
  vehiclePrice: { alignItems: 'flex-end', minWidth: 60 },
  vehiclePriceText: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: '#333' },
  vehiclePriceActive: { color: Colors.primary },
  vehiclePriceDash: { fontSize: FontSizes.lg, color: '#CCC' },
  rentalHint: {
    fontSize: FontSizes.xs,
    color: '#64748B',
    marginBottom: Spacing.sm,
    marginTop: 2,
    paddingHorizontal: 2,
  },
  rentalPackages: { marginTop: Spacing.sm, gap: 6 },
  rentalPkgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rentalPkgRowActive: {
    backgroundColor: '#F3E8FF',
    borderColor: Colors.primary,
  },
  rentalPkgLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rentalRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rentalRadioActive: { borderColor: Colors.primary },
  rentalRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  rentalPkgTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: '#0F172A' },
  rentalPkgTitleActive: { color: Colors.primary },
  rentalPkgSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  rentalPkgPrice: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: '#334155' },
  rentalPkgPriceActive: { color: Colors.primary },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  etaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F5FF',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: Spacing.sm,
  },
  etaBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  etaBarText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: '#1E3A8A', flexShrink: 1 },
  etaBarFare: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: Colors.primary, marginLeft: 8 },
  optionsRow: { flexDirection: 'row', marginBottom: Spacing.sm, gap: 8 },
  optionChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F5F5F5', gap: 4 },
  optionChipActive: { backgroundColor: '#F0E8FF', borderWidth: 1, borderColor: Colors.primary },
  optionChipText: { fontSize: FontSizes.xs, color: '#666', fontWeight: FontWeights.medium },
  optionChipTextActive: { color: Colors.primary },
  bookButton: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  bookButtonDisabled: { opacity: 0.6 },
  bookButtonText: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: '#FFF' },

  // Options modal
  optionsModal: { flex: 1, backgroundColor: '#F8F9FA' },
  optionsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  optionsTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: '#000' },
  optionsContent: { flex: 1, padding: Spacing.md },
  optionSection: { backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  optionSectionTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: '#000', marginBottom: Spacing.sm },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, backgroundColor: '#F5F5F5', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: '#666' },
  toggleTextActive: { color: '#FFF' },
  scheduleInputs: { marginTop: Spacing.sm, gap: 8 },
  optionInput: { backgroundColor: '#F5F5F5', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSizes.md, color: '#000' },
  paymentRow: { flexDirection: 'row', gap: 8 },
  paymentChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: BorderRadius.md, backgroundColor: '#F5F5F5', gap: 6 },
  paymentChipActive: { backgroundColor: '#F0E8FF', borderWidth: 1, borderColor: Colors.primary },
  paymentChipText: { fontSize: FontSizes.sm, color: '#666', fontWeight: FontWeights.medium },
  paymentChipTextActive: { color: Colors.primary },
  prefItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: Spacing.sm },
  prefLabel: { flex: 1, fontSize: FontSizes.md, color: '#333' },
  prefCheck: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#CCC', alignItems: 'center', justifyContent: 'center' },
  prefCheckActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionsDoneBar: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  doneButton: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center' },
  doneButtonText: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: '#FFF' },
});
