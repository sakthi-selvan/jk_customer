import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LocationSearchInput, LocationResult } from '../src/components/map/LocationSearchInput';
import { RouteMapView } from '../src/components/map/RouteMapView';
import { Button } from '../src/components/common/Button';
import { Card } from '../src/components/common/Card';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';
import { bookingEnhancedApi } from '../src/api/booking-enhanced';
import { VehicleCategory, TripType, FareBreakdown } from '../src/types/enhanced';

const { height } = Dimensions.get('window');

export default function BookRideMapScreen() {
  const [step, setStep] = useState<'location' | 'vehicle'>('location');

  // Location state
  const [pickupLocation, setPickupLocation] = useState<LocationResult | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<LocationResult | null>(null);

  // Vehicle state
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategory>(VehicleCategory.MINI);
  const [fareBreakdown, setFareBreakdown] = useState<FareBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pickupLocation && dropoffLocation && step === 'vehicle') {
      calculateFare();
    }
  }, [selectedVehicle, pickupLocation, dropoffLocation, step]);

  const calculateFare = async () => {
    if (!pickupLocation || !dropoffLocation) return;

    try {
      setLoading(true);
      const fare = await bookingEnhancedApi.calculateFare({
        pickup_lat: pickupLocation.latitude,
        pickup_lng: pickupLocation.longitude,
        dropoff_lat: dropoffLocation.latitude,
        dropoff_lng: dropoffLocation.longitude,
        vehicle_category: selectedVehicle,
        trip_type: TripType.ONE_WAY,
      });
      setFareBreakdown(fare);
    } catch (error) {
      console.error('Error calculating fare:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!pickupLocation) {
      Alert.alert('Required', 'Please select pickup location');
      return;
    }
    if (!dropoffLocation) {
      Alert.alert('Required', 'Please select dropoff location');
      return;
    }
    setStep('vehicle');
  };

  const handleBookRide = async () => {
    if (!pickupLocation || !dropoffLocation || !fareBreakdown) return;

    try {
      setLoading(true);
      const ride = await bookingEnhancedApi.createRide({
        trip_type: TripType.ONE_WAY,
        pickup_location: pickupLocation.address,
        pickup_lat: pickupLocation.latitude,
        pickup_lng: pickupLocation.longitude,
        dropoff_location: dropoffLocation.address,
        dropoff_lat: dropoffLocation.latitude,
        dropoff_lng: dropoffLocation.longitude,
        vehicle_category: selectedVehicle,
        is_scheduled: false,
        booking_for_self: true,
        preferences: {
          ac_preferred: false,
          pet_friendly: false,
          silent_ride: false,
          extra_luggage: false,
          wheelchair_support: false,
        },
      });

      Alert.alert(
        'Ride Booked!',
        `Your ride has been booked successfully. Ride ID: ${ride.id}`,
        [
          {
            text: 'View Ride',
            onPress: () => router.replace('/rides'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to book ride');
    } finally {
      setLoading(false);
    }
  };

  const vehicleOptions = [
    {
      type: VehicleCategory.MINI,
      name: 'Mini',
      icon: 'car-outline' as const,
      capacity: '4 seats',
      description: 'Affordable rides',
    },
    {
      type: VehicleCategory.SEDAN,
      name: 'Sedan',
      icon: 'car-sport-outline' as const,
      capacity: '4 seats',
      description: 'Comfortable sedans',
    },
    {
      type: VehicleCategory.SUV,
      name: 'SUV',
      icon: 'car-outline' as const,
      capacity: '6-7 seats',
      description: 'Spacious SUVs',
    },
    {
      type: VehicleCategory.PREMIUM,
      name: 'Premium',
      icon: 'car-sport' as const,
      capacity: '4 seats',
      description: 'Luxury experience',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step === 'vehicle') {
              setStep('location');
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'location' ? 'Choose Location' : 'Select Vehicle'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Map or Location Input */}
      {step === 'location' ? (
        <View style={styles.content}>
          {/* Location Inputs */}
          <View style={styles.locationInputs}>
            <LocationSearchInput
              placeholder="Enter pickup location"
              icon="radio-button-on"
              onLocationSelect={setPickupLocation}
              initialValue={pickupLocation?.address}
            />
            <LocationSearchInput
              placeholder="Enter dropoff location"
              icon="location"
              onLocationSelect={setDropoffLocation}
              initialValue={dropoffLocation?.address}
            />
          </View>

          {/* Map Preview */}
          {pickupLocation && dropoffLocation ? (
            <View style={styles.mapContainer}>
              <RouteMapView
                pickupLocation={{
                  latitude: pickupLocation.latitude,
                  longitude: pickupLocation.longitude,
                  name: pickupLocation.name,
                }}
                dropoffLocation={{
                  latitude: dropoffLocation.latitude,
                  longitude: dropoffLocation.longitude,
                  name: dropoffLocation.name,
                }}
              />
            </View>
          ) : (
            <View style={styles.emptyMap}>
              <Ionicons name="map-outline" size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyMapText}>
                Select pickup and dropoff to see route
              </Text>
            </View>
          )}

          {/* Continue Button */}
          <View style={styles.bottomBar}>
            <Button
              title="Continue"
              onPress={handleContinue}
              fullWidth
              disabled={!pickupLocation || !dropoffLocation}
            />
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Small Map Preview */}
          {pickupLocation && dropoffLocation && (
            <View style={styles.smallMapContainer}>
              <RouteMapView
                pickupLocation={{
                  latitude: pickupLocation.latitude,
                  longitude: pickupLocation.longitude,
                }}
                dropoffLocation={{
                  latitude: dropoffLocation.latitude,
                  longitude: dropoffLocation.longitude,
                }}
              />
            </View>
          )}

          {/* Vehicle Selection */}
          <ScrollView style={styles.vehicleScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.vehicleList}>
              {vehicleOptions.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.type}
                  style={[
                    styles.vehicleCard,
                    selectedVehicle === vehicle.type && styles.vehicleCardSelected,
                  ]}
                  onPress={() => setSelectedVehicle(vehicle.type)}
                >
                  <View style={styles.vehicleCardLeft}>
                    <View
                      style={[
                        styles.vehicleIcon,
                        selectedVehicle === vehicle.type && styles.vehicleIconSelected,
                      ]}
                    >
                      <Ionicons
                        name={vehicle.icon}
                        size={28}
                        color={
                          selectedVehicle === vehicle.type ? Colors.white : Colors.primary
                        }
                      />
                    </View>
                    <View style={styles.vehicleInfo}>
                      <Text style={styles.vehicleName}>{vehicle.name}</Text>
                      <Text style={styles.vehicleCapacity}>{vehicle.capacity}</Text>
                      <Text style={styles.vehicleDescription}>{vehicle.description}</Text>
                    </View>
                  </View>
                  <View style={styles.vehicleCardRight}>
                    {loading ? (
                      <Text style={styles.vehiclePrice}>...</Text>
                    ) : fareBreakdown && selectedVehicle === vehicle.type ? (
                      <Text style={styles.vehiclePrice}>
                        ₹{fareBreakdown.total_fare.toFixed(0)}
                      </Text>
                    ) : (
                      <Text style={styles.vehiclePrice}>-</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fare Breakdown */}
            {fareBreakdown && (
              <Card style={styles.fareCard}>
                <Text style={styles.fareTitle}>Fare Breakdown</Text>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Base Fare</Text>
                  <Text style={styles.fareValue}>₹{fareBreakdown.base_fare.toFixed(0)}</Text>
                </View>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>
                    Distance ({fareBreakdown.distance_km.toFixed(1)} km)
                  </Text>
                  <Text style={styles.fareValue}>₹{fareBreakdown.distance_fare.toFixed(0)}</Text>
                </View>
                {fareBreakdown.time_fare > 0 && (
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>Time Charges</Text>
                    <Text style={styles.fareValue}>₹{fareBreakdown.time_fare.toFixed(0)}</Text>
                  </View>
                )}
                <View style={[styles.fareRow, styles.fareTotal]}>
                  <Text style={styles.fareTotalLabel}>Total</Text>
                  <Text style={styles.fareTotalValue}>₹{fareBreakdown.total_fare.toFixed(0)}</Text>
                </View>
              </Card>
            )}
          </ScrollView>

          {/* Book Button */}
          <View style={styles.bottomBar}>
            <Button
              title={loading ? 'Booking...' : 'Book Ride'}
              onPress={handleBookRide}
              fullWidth
              disabled={loading || !fareBreakdown}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  locationInputs: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mapContainer: {
    flex: 1,
  },
  emptyMap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  emptyMapText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  smallMapContainer: {
    height: 200,
    backgroundColor: Colors.surface,
  },
  vehicleScroll: {
    flex: 1,
  },
  vehicleList: {
    padding: Spacing.md,
  },
  vehicleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  vehicleCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F9FF',
  },
  vehicleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconSelected: {
    backgroundColor: Colors.primary,
  },
  vehicleInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  vehicleName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  vehicleCapacity: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  vehicleDescription: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  vehicleCardRight: {
    alignItems: 'flex-end',
  },
  vehiclePrice: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  fareCard: {
    margin: Spacing.md,
    marginTop: 0,
  },
  fareTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  fareLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  fareValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  fareTotal: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  fareTotalLabel: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  fareTotalValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  bottomBar: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.md,
  },
});
