import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { bookingEnhancedApi, userEnhancedApi } from '../src/api/booking-enhanced';
import { useRideStore } from '../src/store/rideStore';
import { Button } from '../src/components/common/Button';
import { Card } from '../src/components/common/Card';
import { VehicleCategoryImage } from '../src/components/ride/VehicleCategoryImage';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';
import { LoadingAnimation } from '../src/components/common/LoadingAnimation';
import {
  TripType,
  VehicleCategory,
  VehicleCategoryData,
  RidePreferences,
  FareBreakdown,
} from '../src/types/enhanced';

export default function BookRideEnhancedScreen() {
  const getActiveRide = useRideStore((s) => s.getActiveRide);
  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Trip Type
  const [tripType, setTripType] = useState<TripType>(TripType.ONE_WAY);

  // Step 2: Locations
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupLat, setPickupLat] = useState(12.9716);
  const [pickupLng, setPickupLng] = useState(77.5946);
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [dropoffLat, setDropoffLat] = useState(12.9352);
  const [dropoffLng, setDropoffLng] = useState(77.6245);
  const [driverNotes, setDriverNotes] = useState('');

  // Step 3: Timing
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  // Step 4: Booking For
  const [bookingForSelf, setBookingForSelf] = useState(true);
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerNotes, setPassengerNotes] = useState('');

  // Step 5: Vehicle Category
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategoryData[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategory>(VehicleCategory.AUTO);
  const [fareBreakdown, setFareBreakdown] = useState<FareBreakdown | null>(null);

  // Step 6: Preferences
  const [preferences, setPreferences] = useState<RidePreferences>({
    ac_preferred: false,
    pet_friendly: false,
    silent_ride: false,
    extra_luggage: false,
    wheelchair_support: false,
  });

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Fare modal
  const [showFareModal, setShowFareModal] = useState(false);

  useEffect(() => {
    loadVehicleCategories();
  }, []);

  const loadVehicleCategories = async () => {
    try {
      setLoadingCategories(true);
      const categories = await bookingEnhancedApi.getVehicleCategories();
      setVehicleCategories(categories);
    } catch (error) {
      Alert.alert('Error', 'Failed to load vehicle categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const calculateFare = async () => {
    if (!dropoffLocation && tripType !== TripType.RENTAL) return;

    try {
      const fare = await bookingEnhancedApi.calculateFare({
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        dropoff_lat: dropoffLat || pickupLat,
        dropoff_lng: dropoffLng || pickupLng,
        vehicle_category: selectedVehicle,
        trip_type: tripType,
        scheduled_datetime: isScheduled ? scheduledDate : undefined,
      });
      setFareBreakdown(fare);
    } catch (error) {
      console.error('Fare calculation error:', error);
    }
  };

  useEffect(() => {
    if (currentStep === 5) {
      calculateFare();
    }
  }, [currentStep, selectedVehicle, tripType]);

  const validateStep = () => {
    switch (currentStep) {
      case 2:
        if (!pickupLocation) {
          Alert.alert('Error', 'Please enter pickup location');
          return false;
        }
        if (tripType !== TripType.RENTAL && !dropoffLocation) {
          Alert.alert('Error', 'Please enter dropoff location');
          return false;
        }
        return true;
      case 4:
        if (!bookingForSelf && (!passengerName || !passengerPhone)) {
          Alert.alert('Error', 'Please enter passenger details');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    } else {
      handleBookRide();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleBookRide = async () => {
    try {
      setIsLoading(true);

      // Final validation
      if (!pickupLocation.trim()) {
        Alert.alert('Missing Information', 'Please enter pickup location');
        return;
      }

      if (tripType !== TripType.RENTAL && !dropoffLocation.trim()) {
        Alert.alert('Missing Information', 'Please enter dropoff location');
        return;
      }

      if (!bookingForSelf && (!passengerName.trim() || !passengerPhone.trim())) {
        Alert.alert(
          'Passenger Details Required',
          'Please enter passenger name and phone number when booking for someone else'
        );
        return;
      }

      if (isScheduled && !scheduledDate) {
        Alert.alert('Scheduling Error', 'Please select a date and time for scheduled ride');
        return;
      }

      // Check for scheduled time in the past
      if (isScheduled && new Date(scheduledDate) < new Date()) {
        Alert.alert(
          'Invalid Schedule Time',
          'Scheduled time must be in the future. Please select a later time.'
        );
        return;
      }

      const bookingData = {
        trip_type: tripType,
        vehicle_category: selectedVehicle,
        pickup_location: pickupLocation.trim(),
        dropoff_location: tripType === TripType.RENTAL ? undefined : dropoffLocation.trim(),
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        dropoff_lat: tripType === TripType.RENTAL ? undefined : dropoffLat,
        dropoff_lng: tripType === TripType.RENTAL ? undefined : dropoffLng,
        is_scheduled: isScheduled,
        scheduled_datetime: isScheduled ? scheduledDate : undefined,
        booking_for_self: bookingForSelf,
        passenger_name: !bookingForSelf ? passengerName.trim() : undefined,
        passenger_phone: !bookingForSelf ? passengerPhone.trim() : undefined,
        passenger_notes: !bookingForSelf ? passengerNotes.trim() : undefined,
        preferences,
        driver_notes: driverNotes ? driverNotes.trim() : undefined,
        payment_method: 'cash',
      };

      const ride = await bookingEnhancedApi.createBooking(bookingData);

      await getActiveRide();
      Alert.alert(
        'Booking Confirmed',
        'Looking for nearby captains. Track your ride on the map.',
        [{ text: 'Track Ride', onPress: () => router.replace('/') }]
      );
    } catch (error: any) {
      let errorMessage = 'Failed to book ride. Please try again.';

      if (error.response?.status === 400) {
        errorMessage = error.response.data?.detail || 'Invalid booking details. Please check and try again.';
      } else if (error.response?.status === 409) {
        errorMessage = 'You already have an active ride. Please complete it before booking a new one.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please login again.';
        setTimeout(() => router.replace('/(auth)/login'), 2000);
      } else if (error.message === 'Network Error') {
        errorMessage = 'Network connection error. Please check your internet and try again.';
      }

      Alert.alert('Booking Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePreference = (key: keyof RidePreferences) => {
    setPreferences({ ...preferences, [key]: !preferences[key] });
  };

  const renderTripTypeSelector = () => {
    const tripTypes = [
      { value: TripType.ONE_WAY, label: 'One Way', icon: 'arrow-forward' },
      { value: TripType.RENTAL, label: 'Rental', icon: 'time' },
      { value: TripType.OUTSTATION, label: 'Outstation', icon: 'car' },
    ];

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Select Trip Type</Text>
        <View style={styles.tripTypeGrid}>
          {tripTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.tripTypeCard,
                tripType === type.value && styles.tripTypeCardActive,
              ]}
              onPress={() => setTripType(type.value)}
            >
              <Ionicons
                name={type.icon as any}
                size={32}
                color={tripType === type.value ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.tripTypeLabel,
                  tripType === type.value && styles.tripTypeLabelActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderLocationInputs = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Pickup & Drop Location</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pickup Location *</Text>
        <TextInput
          style={styles.input}
          value={pickupLocation}
          onChangeText={setPickupLocation}
          placeholder="Enter pickup address"
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      {tripType !== TripType.RENTAL && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Drop Location *</Text>
          <TextInput
            style={styles.input}
            value={dropoffLocation}
            onChangeText={setDropoffLocation}
            placeholder="Enter drop address"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pickup Instructions (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={driverNotes}
          onChangeText={setDriverNotes}
          placeholder="e.g., Near temple gate, Call after reaching"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderTimingSelector = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>When do you need the ride?</Text>

      <TouchableOpacity
        style={[styles.optionRow, !isScheduled && styles.optionRowActive]}
        onPress={() => setIsScheduled(false)}
      >
        <Ionicons
          name={!isScheduled ? 'radio-button-on' : 'radio-button-off'}
          size={24}
          color={Colors.primary}
        />
        <Text style={styles.optionText}>Ride Now</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.optionRow, isScheduled && styles.optionRowActive]}
        onPress={() => setIsScheduled(true)}
      >
        <Ionicons
          name={isScheduled ? 'radio-button-on' : 'radio-button-off'}
          size={24}
          color={Colors.primary}
        />
        <Text style={styles.optionText}>Schedule Ride</Text>
      </TouchableOpacity>

      {isScheduled && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Date & Time</Text>
          <TextInput
            style={styles.input}
            value={scheduledDate}
            onChangeText={setScheduledDate}
            placeholder="2026-05-20T08:30:00"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.helperText}>Format: YYYY-MM-DDTHH:MM:SS</Text>
        </View>
      )}
    </View>
  );

  const renderBookingForSelector = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Who is this booking for?</Text>

      <TouchableOpacity
        style={[styles.optionRow, bookingForSelf && styles.optionRowActive]}
        onPress={() => setBookingForSelf(true)}
      >
        <Ionicons
          name={bookingForSelf ? 'radio-button-on' : 'radio-button-off'}
          size={24}
          color={Colors.primary}
        />
        <Text style={styles.optionText}>Book for Myself</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.optionRow, !bookingForSelf && styles.optionRowActive]}
        onPress={() => setBookingForSelf(false)}
      >
        <Ionicons
          name={!bookingForSelf ? 'radio-button-on' : 'radio-button-off'}
          size={24}
          color={Colors.primary}
        />
        <Text style={styles.optionText}>Book for Someone Else</Text>
      </TouchableOpacity>

      {!bookingForSelf && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Passenger Name *</Text>
            <TextInput
              style={styles.input}
              value={passengerName}
              onChangeText={setPassengerName}
              placeholder="Enter passenger name"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Passenger Phone *</Text>
            <TextInput
              style={styles.input}
              value={passengerPhone}
              onChangeText={setPassengerPhone}
              placeholder="Enter phone number"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={passengerNotes}
              onChangeText={setPassengerNotes}
              placeholder="e.g., Senior citizen passenger"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={2}
            />
          </View>
        </>
      )}
    </View>
  );

  const renderVehicleSelector = () => {
    if (loadingCategories) {
      return (
        <View style={styles.centerContent}>
          <LoadingAnimation size="large" />
        </View>
      );
    }

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Select Vehicle</Text>

        {vehicleCategories.map((vehicle) => (
          <TouchableOpacity
            key={vehicle.id}
            style={[
              styles.vehicleCard,
              selectedVehicle === vehicle.name && styles.vehicleCardActive,
            ]}
            onPress={() => setSelectedVehicle(vehicle.name as VehicleCategory)}
          >
            <View style={styles.vehicleHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.sm }}>
                <VehicleCategoryImage type={vehicle.name} width={80} height={56} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehicleName}>{vehicle.display_name}</Text>
                  <Text style={styles.vehicleCapacity}>{vehicle.seater_capacity} Seater</Text>
                </View>
              </View>
              <View style={styles.vehiclePricing}>
                <Text style={styles.vehiclePrice}>₹{vehicle.base_fare}</Text>
                <Text style={styles.vehicleRate}>₹{vehicle.per_km_rate}/km</Text>
              </View>
            </View>

            <Text style={styles.vehicleExamples}>
              {vehicle.example_vehicles.join(' • ')}
            </Text>

            {fareBreakdown && selectedVehicle === vehicle.name && (
              <TouchableOpacity
                style={styles.fareButton}
                onPress={() => setShowFareModal(true)}
              >
                <Text style={styles.fareButtonText}>
                  Total: ₹{fareBreakdown.total.toFixed(2)}
                </Text>
                <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderPreferences = () => {
    const prefs = [
      { key: 'ac_preferred' as keyof RidePreferences, label: 'AC Preferred', icon: 'snow' },
      { key: 'pet_friendly' as keyof RidePreferences, label: 'Pet Friendly', icon: 'paw' },
      { key: 'silent_ride' as keyof RidePreferences, label: 'Silent Ride', icon: 'volume-mute' },
      { key: 'extra_luggage' as keyof RidePreferences, label: 'Extra Luggage', icon: 'bag-handle' },
      { key: 'wheelchair_support' as keyof RidePreferences, label: 'Wheelchair Support', icon: 'accessibility' },
    ];

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Ride Preferences (Optional)</Text>

        {prefs.map((pref) => (
          <TouchableOpacity
            key={pref.key}
            style={styles.preferenceRow}
            onPress={() => togglePreference(pref.key)}
          >
            <View style={styles.preferenceLeft}>
              <Ionicons name={pref.icon as any} size={20} color={Colors.textSecondary} />
              <Text style={styles.preferenceText}>{pref.label}</Text>
            </View>
            <Ionicons
              name={preferences[pref.key] ? 'checkbox' : 'square-outline'}
              size={24}
              color={preferences[pref.key] ? Colors.primary : Colors.textMuted}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderFareModal = () => (
    <Modal visible={showFareModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Fare Breakdown</Text>
            <TouchableOpacity onPress={() => setShowFareModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {fareBreakdown && (
            <View style={styles.fareBreakdownContent}>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Base Fare</Text>
                <Text style={styles.fareValue}>₹{fareBreakdown.base_fare.toFixed(2)}</Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Distance Fare</Text>
                <Text style={styles.fareValue}>₹{fareBreakdown.distance_fare.toFixed(2)}</Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Platform Fee</Text>
                <Text style={styles.fareValue}>₹{fareBreakdown.platform_fee.toFixed(2)}</Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>GST (5%)</Text>
                <Text style={styles.fareValue}>₹{fareBreakdown.gst.toFixed(2)}</Text>
              </View>
              {fareBreakdown.night_charges > 0 && (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Night Charges</Text>
                  <Text style={styles.fareValue}>₹{fareBreakdown.night_charges.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.fareDivider} />
              <View style={styles.fareRow}>
                <Text style={styles.fareTotalLabel}>Total</Text>
                <Text style={styles.fareTotalValue}>₹{fareBreakdown.total.toFixed(2)}</Text>
              </View>
            </View>
          )}

          <Button title="Close" onPress={() => setShowFareModal(false)} fullWidth />
        </View>
      </View>
    </Modal>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderTripTypeSelector();
      case 2:
        return renderLocationInputs();
      case 3:
        return renderTimingSelector();
      case 4:
        return renderBookingForSelector();
      case 5:
        return renderVehicleSelector();
      case 6:
        return renderPreferences();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Ride</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressBar}>
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <View
            key={step}
            style={[
              styles.progressDot,
              step <= currentStep && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={currentStep === 6 ? 'Book Ride' : 'Next'}
          onPress={handleNext}
          loading={isLoading}
          fullWidth
        />
      </View>

      {renderFareModal()}
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
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  progressDot: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  stepContent: {
    marginBottom: Spacing.xl,
  },
  stepTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  tripTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  tripTypeCard: {
    width: '48%',
    aspectRatio: 1.5,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  tripTypeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.card,
  },
  tripTypeLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  tripTypeLabelActive: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  optionRowActive: {
    borderColor: Colors.primary,
  },
  optionText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginLeft: Spacing.md,
    fontWeight: FontWeights.medium,
  },
  vehicleCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  vehicleCardActive: {
    borderColor: Colors.primary,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  vehicleName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  vehicleCapacity: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  vehiclePricing: {
    alignItems: 'flex-end',
  },
  vehiclePrice: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  vehicleRate: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  vehicleExamples: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  fareButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  fareButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  preferenceText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  fareBreakdownContent: {
    marginBottom: Spacing.xl,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  fareLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  fareValue: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  fareDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  fareTotalLabel: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  fareTotalValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
});
