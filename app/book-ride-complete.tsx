import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LocationSearchInput, LocationResult } from '../src/components/map/LocationSearchInput';
import { SimpleMap } from '../src/components/map/SimpleMap';
import { Button } from '../src/components/common/Button';
import { Card } from '../src/components/common/Card';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';
import { bookingEnhancedApi } from '../src/api/booking-enhanced';
import { VehicleCategory, TripType, FareBreakdown } from '../src/types/enhanced';

type BookingStep = 'location' | 'trip_type' | 'vehicle' | 'details' | 'confirm';

const TRIP_TYPES = [
  { id: TripType.ONE_WAY, name: 'One Way', icon: 'arrow-forward', color: '#4CAF50' },
  { id: TripType.ROUND_TRIP, name: 'Round Trip', icon: 'swap-horizontal', color: '#2196F3' },
  { id: TripType.RENTAL, name: 'Rental', icon: 'time', color: '#FF9800' },
  { id: TripType.OUTSTATION, name: 'Outstation', icon: 'car-sport', color: '#9C27B0' },
  { id: TripType.AIRPORT_PICKUP, name: 'Airport Pickup', icon: 'airplane', color: '#F44336' },
  { id: TripType.AIRPORT_DROP, name: 'Airport Drop', icon: 'airplane', color: '#E91E63' },
];

const VEHICLE_OPTIONS = [
  {
    type: VehicleCategory.MINI,
    name: 'Mini',
    icon: 'car-outline',
    capacity: '4 seats',
    description: 'Affordable & compact',
    color: '#4CAF50',
  },
  {
    type: VehicleCategory.SEDAN,
    name: 'Sedan',
    icon: 'car-sport-outline',
    capacity: '4 seats',
    description: 'Comfortable sedans',
    color: '#2196F3',
  },
  {
    type: VehicleCategory.SUV,
    name: 'SUV',
    icon: 'car',
    capacity: '6-7 seats',
    description: 'Spacious vehicles',
    color: '#FF9800',
  },
  {
    type: VehicleCategory.PREMIUM,
    name: 'Premium',
    icon: 'car-sport',
    capacity: '4 seats',
    description: 'Luxury experience',
    color: '#9C27B0',
  },
];

export default function BookRideCompleteScreen() {
  const [step, setStep] = useState<BookingStep>('location');
  const [loading, setLoading] = useState(false);

  // Location state
  const [pickupLocation, setPickupLocation] = useState<LocationResult | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<LocationResult | null>(null);

  // Trip type
  const [tripType, setTripType] = useState<TripType>(TripType.ONE_WAY);

  // Vehicle state
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategory>(VehicleCategory.MINI);
  const [fareBreakdown, setFareBreakdown] = useState<FareBreakdown | null>(null);

  // Details state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [bookingForSelf, setBookingForSelf] = useState(true);
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');

  const [driverNotes, setDriverNotes] = useState('');

  // Preferences
  const [preferences, setPreferences] = useState({
    ac_preferred: false,
    pet_friendly: false,
    silent_ride: false,
    extra_luggage: false,
    wheelchair_support: false,
  });

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
        trip_type: tripType,
        scheduled_time: isScheduled ? scheduledDate.toISOString() : undefined,
      });
      setFareBreakdown(fare);
    } catch (error) {
      console.error('Error calculating fare:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 'location') {
      if (!pickupLocation || !dropoffLocation) {
        Alert.alert('Required', 'Please select both pickup and dropoff locations');
        return;
      }
      setStep('trip_type');
    } else if (step === 'trip_type') {
      setStep('vehicle');
      calculateFare();
    } else if (step === 'vehicle') {
      if (!fareBreakdown) {
        Alert.alert('Error', 'Please wait for fare calculation');
        return;
      }
      setStep('details');
    } else if (step === 'details') {
      if (!bookingForSelf && (!passengerName || !passengerPhone)) {
        Alert.alert('Required', 'Please enter passenger details');
        return;
      }
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'location') {
      router.back();
    } else if (step === 'trip_type') {
      setStep('location');
    } else if (step === 'vehicle') {
      setStep('trip_type');
    } else if (step === 'details') {
      setStep('vehicle');
    } else if (step === 'confirm') {
      setStep('details');
    }
  };

  const handleBookRide = async () => {
    if (!pickupLocation || !dropoffLocation || !fareBreakdown) return;

    try {
      setLoading(true);
      const ride = await bookingEnhancedApi.createRide({
        trip_type: tripType,
        pickup_location: pickupLocation.address,
        pickup_lat: pickupLocation.latitude,
        pickup_lng: pickupLocation.longitude,
        dropoff_location: dropoffLocation.address,
        dropoff_lat: dropoffLocation.latitude,
        dropoff_lng: dropoffLocation.longitude,
        vehicle_category: selectedVehicle,
        is_scheduled: isScheduled,
        scheduled_time: isScheduled ? scheduledDate.toISOString() : undefined,
        booking_for_self: bookingForSelf,
        passenger_name: bookingForSelf ? undefined : passengerName,
        passenger_phone: bookingForSelf ? undefined : passengerPhone,
        driver_notes: driverNotes || undefined,
        preferences,
      });

      Alert.alert(
        'Ride Booked Successfully! 🎉',
        `Your ${TRIP_TYPES.find(t => t.id === tripType)?.name} ride is confirmed.\n\nRide OTP: ${ride.ride_otp}\n\nShare this OTP with your driver.`,
        [
          {
            text: 'View Rides',
            onPress: () => router.replace('/rides'),
          },
          {
            text: 'Book Another',
            onPress: () => {
              setStep('location');
              setPickupLocation(null);
              setDropoffLocation(null);
              setFareBreakdown(null);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Booking Failed', error.response?.data?.detail || 'Failed to book ride');
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => {
    const steps = ['location', 'trip_type', 'vehicle', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);

    return (
      <View style={styles.progressContainer}>
        {steps.map((s, index) => (
          <View key={s} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                index <= currentIndex && styles.progressDotActive,
              ]}
            >
              <Text style={[
                styles.progressNumber,
                index <= currentIndex && styles.progressNumberActive,
              ]}>
                {index + 1}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  index < currentIndex && styles.progressLineActive,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderLocationStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        <Text style={styles.stepTitle}>📍 Choose Your Locations</Text>
        <Text style={styles.stepDescription}>
          Select your pickup and dropoff locations to get started
        </Text>

        <View style={styles.locationContainer}>
          <LocationSearchInput
            placeholder="Pickup location (Current location)"
            icon="radio-button-on"
            onLocationSelect={setPickupLocation}
            initialValue={pickupLocation?.address}
          />
          <View style={styles.locationDivider}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerDots}>
              <View style={styles.dividerDot} />
              <View style={styles.dividerDot} />
              <View style={styles.dividerDot} />
            </View>
            <View style={styles.dividerLine} />
          </View>
          <LocationSearchInput
            placeholder="Dropoff location"
            icon="location"
            onLocationSelect={setDropoffLocation}
            initialValue={dropoffLocation?.address}
          />
        </View>

        {pickupLocation && dropoffLocation && (
          <View style={styles.mapPreview}>
            <View style={styles.mapContainer}>
              <SimpleMap
                latitude={(pickupLocation.latitude + dropoffLocation.latitude) / 2}
                longitude={(pickupLocation.longitude + dropoffLocation.longitude) / 2}
                showMarker={false}
              />
              <View style={styles.routeOverlay}>
                <View style={styles.routePoint}>
                  <Ionicons name="radio-button-on" size={24} color="#4CAF50" />
                  <Text style={styles.routeText} numberOfLines={1}>{pickupLocation.name}</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routePoint}>
                  <Ionicons name="location" size={24} color="#F44336" />
                  <Text style={styles.routeText} numberOfLines={1}>{dropoffLocation.name}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </Card>
    </ScrollView>
  );

  const renderTripTypeStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        <Text style={styles.stepTitle}>🚗 Select Trip Type</Text>
        <Text style={styles.stepDescription}>
          Choose the type of ride you need
        </Text>

        <View style={styles.tripTypeGrid}>
          {TRIP_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.tripTypeCard,
                tripType === type.id && styles.tripTypeCardActive,
                { borderColor: type.color },
              ]}
              onPress={() => setTripType(type.id)}
            >
              <View style={[styles.tripTypeIcon, { backgroundColor: type.color }]}>
                <Ionicons name={type.icon as any} size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.tripTypeName}>{type.name}</Text>
              {tripType === type.id && (
                <View style={styles.tripTypeCheck}>
                  <Ionicons name="checkmark-circle" size={24} color={type.color} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    </ScrollView>
  );

  const renderVehicleStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        <Text style={styles.stepTitle}>🚙 Choose Your Vehicle</Text>
        <Text style={styles.stepDescription}>
          Select a vehicle category that suits your needs
        </Text>

        <View style={styles.vehicleList}>
          {VEHICLE_OPTIONS.map((vehicle) => {
            const isFareLoading = loading && selectedVehicle === vehicle.type;
            const showFare = fareBreakdown && selectedVehicle === vehicle.type;

            return (
              <TouchableOpacity
                key={vehicle.type}
                style={[
                  styles.vehicleCard,
                  selectedVehicle === vehicle.type && styles.vehicleCardActive,
                  { borderLeftColor: vehicle.color, borderLeftWidth: 4 },
                ]}
                onPress={() => setSelectedVehicle(vehicle.type)}
              >
                <View style={[styles.vehicleIconContainer, { backgroundColor: vehicle.color + '20' }]}>
                  <Ionicons name={vehicle.icon as any} size={32} color={vehicle.color} />
                </View>
                <View style={styles.vehicleDetails}>
                  <Text style={styles.vehicleName}>{vehicle.name}</Text>
                  <Text style={styles.vehicleCapacity}>{vehicle.capacity}</Text>
                  <Text style={styles.vehicleDescription}>{vehicle.description}</Text>
                </View>
                <View style={styles.vehiclePriceContainer}>
                  {isFareLoading ? (
                    <Text style={styles.vehiclePrice}>...</Text>
                  ) : showFare ? (
                    <Text style={styles.vehiclePrice}>₹{fareBreakdown.total_fare.toFixed(0)}</Text>
                  ) : (
                    <Text style={styles.vehiclePrice}>-</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {fareBreakdown && selectedVehicle && (
          <Card style={styles.fareBreakdownCard}>
            <Text style={styles.fareTitle}>💰 Fare Breakdown</Text>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Base Fare</Text>
              <Text style={styles.fareValue}>₹{fareBreakdown.base_fare.toFixed(0)}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Distance ({fareBreakdown.distance_km.toFixed(1)} km)</Text>
              <Text style={styles.fareValue}>₹{fareBreakdown.distance_fare.toFixed(0)}</Text>
            </View>
            {fareBreakdown.platform_fee > 0 && (
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Platform Fee</Text>
                <Text style={styles.fareValue}>₹{fareBreakdown.platform_fee.toFixed(0)}</Text>
              </View>
            )}
            {fareBreakdown.gst > 0 && (
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>GST (5%)</Text>
                <Text style={styles.fareValue}>₹{fareBreakdown.gst.toFixed(0)}</Text>
              </View>
            )}
            <View style={[styles.fareRow, styles.fareTotalRow]}>
              <Text style={styles.fareTotalLabel}>Total Fare</Text>
              <Text style={styles.fareTotalValue}>₹{fareBreakdown.total_fare.toFixed(0)}</Text>
            </View>
          </Card>
        )}
      </Card>
    </ScrollView>
  );

  const renderDetailsStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        <Text style={styles.stepTitle}>⚙️ Ride Details</Text>

        {/* Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Schedule</Text>
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Schedule for later</Text>
            <Switch
              value={isScheduled}
              onValueChange={setIsScheduled}
              trackColor={{ false: '#ccc', true: Colors.primary + '80' }}
              thumbColor={isScheduled ? Colors.primary : '#f4f3f4'}
            />
          </View>
          {isScheduled && (
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={Colors.primary} />
                <Text style={styles.dateTimeText}>
                  {scheduledDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time" size={20} color={Colors.primary} />
                <Text style={styles.dateTimeText}>
                  {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Booking For */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Booking For</Text>
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Booking for someone else</Text>
            <Switch
              value={!bookingForSelf}
              onValueChange={(v) => setBookingForSelf(!v)}
              trackColor={{ false: '#ccc', true: Colors.primary + '80' }}
              thumbColor={!bookingForSelf ? Colors.primary : '#f4f3f4'}
            />
          </View>
          {!bookingForSelf && (
            <View style={styles.passengerForm}>
              <TextInput
                style={styles.input}
                placeholder="Passenger Name"
                placeholderTextColor="#999"
                value={passengerName}
                onChangeText={setPassengerName}
              />
              <TextInput
                style={styles.input}
                placeholder="Passenger Phone"
                placeholderTextColor="#999"
                value={passengerPhone}
                onChangeText={setPassengerPhone}
                keyboardType="phone-pad"
              />
            </View>
          )}
        </View>

        {/* Driver Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Pickup Instructions (Optional)</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any special instructions for the driver..."
            placeholderTextColor="#999"
            value={driverNotes}
            onChangeText={setDriverNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Ride Preferences</Text>
          </View>
          <View style={styles.preferencesGrid}>
            {[
              { key: 'ac_preferred', label: 'AC Preferred', icon: 'snow' },
              { key: 'pet_friendly', label: 'Pet Friendly', icon: 'paw' },
              { key: 'silent_ride', label: 'Silent Ride', icon: 'volume-mute' },
              { key: 'extra_luggage', label: 'Extra Luggage', icon: 'briefcase' },
              { key: 'wheelchair_support', label: 'Wheelchair', icon: 'accessibility' },
            ].map((pref) => (
              <TouchableOpacity
                key={pref.key}
                style={[
                  styles.preferenceChip,
                  preferences[pref.key as keyof typeof preferences] && styles.preferenceChipActive,
                ]}
                onPress={() =>
                  setPreferences((prev) => ({
                    ...prev,
                    [pref.key]: !prev[pref.key as keyof typeof prev],
                  }))
                }
              >
                <Ionicons
                  name={pref.icon as any}
                  size={18}
                  color={
                    preferences[pref.key as keyof typeof preferences]
                      ? '#FFFFFF'
                      : Colors.primary
                  }
                />
                <Text
                  style={[
                    styles.preferenceLabel,
                    preferences[pref.key as keyof typeof preferences] &&
                      styles.preferenceLabelActive,
                  ]}
                >
                  {pref.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>

      {showDatePicker && (
        <DateTimePicker
          value={scheduledDate}
          mode="date"
          minimumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setScheduledDate(date);
          }}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={scheduledDate}
          mode="time"
          onChange={(event, date) => {
            setShowTimePicker(false);
            if (date) setScheduledDate(date);
          }}
        />
      )}
    </ScrollView>
  );

  const renderConfirmStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        <Text style={styles.stepTitle}>✅ Confirm Your Ride</Text>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Trip Summary</Text>

          <View style={styles.summaryRow}>
            <Ionicons name="swap-horizontal" size={20} color="#666" />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Trip Type</Text>
              <Text style={styles.summaryValue}>
                {TRIP_TYPES.find(t => t.id === tripType)?.name}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons name="radio-button-on" size={20} color="#4CAF50" />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Pickup</Text>
              <Text style={styles.summaryValue}>{pickupLocation?.name || pickupLocation?.address}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons name="location" size={20} color="#F44336" />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Dropoff</Text>
              <Text style={styles.summaryValue}>{dropoffLocation?.name || dropoffLocation?.address}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons name="car" size={20} color="#666" />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Vehicle</Text>
              <Text style={styles.summaryValue}>
                {VEHICLE_OPTIONS.find(v => v.type === selectedVehicle)?.name}
              </Text>
            </View>
          </View>

          {isScheduled && (
            <View style={styles.summaryRow}>
              <Ionicons name="time" size={20} color="#666" />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Scheduled</Text>
                <Text style={styles.summaryValue}>
                  {scheduledDate.toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          {!bookingForSelf && (
            <View style={styles.summaryRow}>
              <Ionicons name="person" size={20} color="#666" />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Passenger</Text>
                <Text style={styles.summaryValue}>
                  {passengerName} ({passengerPhone})
                </Text>
              </View>
            </View>
          )}

          {fareBreakdown && (
            <View style={[styles.summaryRow, styles.totalFareRow]}>
              <Ionicons name="cash" size={24} color={Colors.primary} />
              <View style={styles.summaryContent}>
                <Text style={styles.totalFareLabel}>Total Fare</Text>
                <Text style={styles.totalFareValue}>₹{fareBreakdown.total_fare.toFixed(0)}</Text>
              </View>
            </View>
          )}
        </View>
      </Card>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Your Ride</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Content */}
      {step === 'location' && renderLocationStep()}
      {step === 'trip_type' && renderTripTypeStep()}
      {step === 'vehicle' && renderVehicleStep()}
      {step === 'details' && renderDetailsStep()}
      {step === 'confirm' && renderConfirmStep()}

      {/* Bottom Action Button */}
      <View style={styles.bottomBar}>
        <Button
          title={
            step === 'confirm'
              ? loading
                ? 'Booking...'
                : 'Confirm & Book Ride'
              : 'Continue'
          }
          onPress={step === 'confirm' ? handleBookRide : handleNext}
          fullWidth
          disabled={loading || (step === 'location' && (!pickupLocation || !dropoffLocation))}
          style={{
            backgroundColor: step === 'confirm' ? '#4CAF50' : Colors.primary,
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: '#000',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  progressNumber: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#999',
  },
  progressNumberActive: {
    color: '#FFFFFF',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
  },
  card: {
    margin: Spacing.md,
  },
  stepTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: '#000',
    marginBottom: Spacing.xs,
  },
  stepDescription: {
    fontSize: FontSizes.md,
    color: '#666',
    marginBottom: Spacing.lg,
  },
  locationContainer: {
    marginBottom: Spacing.md,
  },
  locationDivider: {
    height: 40,
    justifyContent: 'center',
    paddingLeft: Spacing.md,
  },
  dividerLine: {
    position: 'absolute',
    left: 27,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#E0E0E0',
  },
  dividerDots: {
    gap: 4,
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#999',
    marginLeft: 25,
  },
  mapPreview: {
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  routeOverlay: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.primary,
    marginLeft: 11,
    marginVertical: 4,
  },
  routeText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: '#000000',
    fontWeight: FontWeights.medium,
  },
  tripTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  tripTypeCard: {
    width: '47%',
    aspectRatio: 1.3,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  tripTypeCardActive: {
    borderWidth: 3,
    backgroundColor: '#F0F9FF',
  },
  tripTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  tripTypeName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#000',
    textAlign: 'center',
  },
  tripTypeCheck: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  vehicleList: {
    gap: Spacing.md,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  vehicleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F9FF',
  },
  vehicleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  vehicleName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#000',
  },
  vehicleCapacity: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginTop: 2,
  },
  vehicleDescription: {
    fontSize: FontSizes.xs,
    color: '#999',
    marginTop: 2,
  },
  vehiclePriceContainer: {
    alignItems: 'flex-end',
  },
  vehiclePrice: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  fareBreakdownCard: {
    marginTop: Spacing.md,
    backgroundColor: '#F0F9FF',
  },
  fareTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#000',
    marginBottom: Spacing.md,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  fareLabel: {
    fontSize: FontSizes.md,
    color: '#666',
  },
  fareValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#000',
  },
  fareTotalRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
  },
  fareTotalLabel: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#000',
  },
  fareTotalValue: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#000',
    marginLeft: Spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  switchLabel: {
    fontSize: FontSizes.md,
    color: '#000000',
    fontWeight: FontWeights.medium,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  dateTimeText: {
    fontSize: FontSizes.md,
    color: '#000000',
    fontWeight: FontWeights.semibold,
  },
  passengerForm: {
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: '#000000',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    fontWeight: FontWeights.medium,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  preferenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  preferenceChipActive: {
    backgroundColor: Colors.primary,
  },
  preferenceLabel: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
  preferenceLabelActive: {
    color: '#FFFFFF',
  },
  summarySection: {
    gap: Spacing.md,
  },
  summaryTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#000',
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: FontSizes.md,
    color: '#000',
    fontWeight: FontWeights.medium,
  },
  totalFareRow: {
    backgroundColor: '#F0F9FF',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    borderBottomWidth: 0,
  },
  totalFareLabel: {
    fontSize: FontSizes.lg,
    color: '#000',
    fontWeight: FontWeights.semibold,
    marginBottom: 4,
  },
  totalFareValue: {
    fontSize: FontSizes.xxxl,
    color: Colors.primary,
    fontWeight: FontWeights.bold,
  },
  bottomBar: {
    padding: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
});
