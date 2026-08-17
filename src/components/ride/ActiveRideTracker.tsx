import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Linking,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { formatApiError } from '../../utils/apiError';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { EnhancedRide } from '../../types/enhanced';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';
import { bookingEnhancedApi } from '../../api/booking-enhanced';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

interface ActiveRideTrackerProps {
  ride: EnhancedRide;
  onRideComplete: () => void;
}

export const ActiveRideTracker: React.FC<ActiveRideTrackerProps> = ({ ride, onRideComplete }) => {
  const { user } = useAuthStore();
  const displayOtp = user?.ride_otp || ride.ride_otp;
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  // Status configurations
  const STATUS_INFO = {
    pending: {
      title: 'Searching for Drivers',
      subtitle: 'Please wait while we find a driver for you',
      color: '#F59E0B',
      icon: 'search',
    },
    accepted: {
      title: 'Driver Assigned',
      subtitle: 'Driver is on the way to pick you up',
      color: '#3B82F6',
      icon: 'checkmark-circle',
    },
    started: {
      title: 'Trip Started',
      subtitle: 'Enjoy your ride',
      color: '#8B5CF6',
      icon: 'car-sport',
    },
    completed: {
      title: 'Trip Completed',
      subtitle: 'Thank you for riding with us',
      color: '#10B981',
      icon: 'checkmark-done-circle',
    },
    cancelled: {
      title: 'Trip Cancelled',
      subtitle: 'Your ride has been cancelled',
      color: '#EF4444',
      icon: 'close-circle',
    },
  };

  const currentStatus = STATUS_INFO[ride.status as keyof typeof STATUS_INFO] || STATUS_INFO.pending;
  const rejectionCount = ride.rejection_count ?? 0;
  const driverName = (ride as any).driver_name || ride.driver?.name || 'Driver';
  const driverRating =
    ride.driver_average_rating != null
      ? ride.driver_average_rating.toFixed(1)
      : null;
  const driverTrips = ride.driver_total_rides ?? 0;
  const driverPhone = (ride as any).driver_phone || ride.driver?.phone || null;
  const vehicleNumber = (ride as any).driver_vehicle_number || ride.driver?.vehicle_number || '—';
  const vehicleType = (ride as any).driver_vehicle_type || ride.driver?.vehicle_type || ride.vehicle_category || '—';

  // Show rating after completion
  useEffect(() => {
    if ((ride.status === 'completed' || ride.status === 'cancelled') && ride.driver_id) {
      if (ride.status === 'completed' || (ride.status === 'cancelled' && ride.otp_verified)) {
        setShowRating(true);
      }
    }
  }, [ride.status]);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingEnhancedApi.cancelRide(ride.id);
              Alert.alert('Ride Cancelled', 'Your ride has been cancelled successfully.');
              onRideComplete();
            } catch (error: any) {
              Alert.alert(
                'Cancellation Failed',
                formatApiError(error, 'Failed to cancel ride. Please try again.')
              );
            }
          },
        },
      ]
    );
  };

  const handleCallDriver = () => {
    if (!ride.driver_id) {
      Alert.alert('Driver Not Assigned', 'No driver has been assigned to your ride yet.');
      return;
    }

    Alert.alert(
      'Call Driver',
      'Would you like to call your driver?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            if (!driverPhone) {
              Alert.alert('Unavailable', 'Driver phone number is not available yet.');
              return;
            }
            Linking.openURL(`tel:${driverPhone}`).catch(() => {
              Alert.alert('Error', 'Unable to make call. Please dial manually.');
            });
          },
        },
      ]
    );
  };

  const handleSOS = () => {
    Alert.alert(
      'Emergency SOS',
      'This will immediately notify:\n• Your emergency contact\n• Emergency services (112)\n\nDo you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Emergency (112)',
          style: 'destructive',
          onPress: () => {
            Linking.openURL('tel:112').catch(() => {
              Alert.alert('Error', 'Unable to make call. Please dial 112 manually.');
            });
          },
        },
      ]
    );
  };

  const handleSubmitRating = () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    Alert.alert(
      'Thank You!',
      'Your rating has been submitted successfully.',
      [{ text: 'OK', onPress: () => setShowRating(false) }]
    );
  };

  // Don't show tracker for scheduled rides until they become active
  if (ride.is_scheduled && ride.status === 'pending') {
    return (
      <View style={styles.scheduledCard}>
        <Ionicons name="calendar" size={48} color={Colors.primary} />
        <Text style={styles.scheduledTitle}>Scheduled Ride</Text>
        <Text style={styles.scheduledDate}>
          {new Date(ride.scheduled_datetime!).toLocaleDateString()} at{' '}
          {new Date(ride.scheduled_datetime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.scheduledInfo}>
          We'll notify you 15 minutes before your scheduled time
        </Text>
        <TouchableOpacity style={styles.viewDetailsButton} onPress={() => router.push('/rides')}>
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Don't show tracker for rides booked for someone else
  if (!ride.booking_for_self) {
    return (
      <View style={styles.scheduledCard}>
        <Ionicons name="people" size={48} color={Colors.primary} />
        <Text style={styles.scheduledTitle}>Ride for {ride.passenger_name}</Text>
        <Text style={styles.scheduledInfo}>
          Phone: {ride.passenger_phone}
        </Text>
        <Text style={styles.scheduledInfo}>
          This ride was booked for someone else. They will manage the ride.
        </Text>
        <TouchableOpacity style={styles.viewDetailsButton} onPress={() => router.push('/rides')}>
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map with Route */}
      <View style={styles.mapContainer}>
        {/* Static map placeholder - replace with actual map component in production */}
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={64} color="#999" />
          <Text style={styles.mapPlaceholderText}>Map View</Text>
          <Text style={styles.mapPlaceholderHint}>Route visualization will appear here</Text>
        </View>

        {/* Map Overlay Info */}
        <View style={styles.mapOverlay}>
          <View style={[styles.statusBadge, { backgroundColor: currentStatus.color }]}>
            <Ionicons name={currentStatus.icon as any} size={16} color="#FFF" />
            <Text style={styles.statusBadgeText}>{currentStatus.title}</Text>
          </View>
        </View>

        {/* ETA Badge (only for accepted/started) */}
        {(ride.status === 'accepted' || ride.status === 'started') && (
          <View style={styles.etaBadge}>
            <Ionicons name="time" size={16} color={Colors.primary} />
            <Text style={styles.etaText}>
              {ride.status === 'accepted' ? `${ride.eta_minutes} min away` : 'In transit'}
            </Text>
          </View>
        )}
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Section */}
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>{currentStatus.title}</Text>
          <Text style={styles.statusSubtitle}>{currentStatus.subtitle}</Text>

          {/* Pending: Show search stats */}
          {ride.status === 'pending' && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="time" size={24} color={Colors.primary} />
                <Text style={styles.statNumber}>{ride.status}</Text>
                <Text style={styles.statLabel}>Looking for driver</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
                <Text style={styles.statNumber}>{rejectionCount}</Text>
                <Text style={styles.statLabel}>Declined</Text>
              </View>
            </View>
          )}
        </View>

        {/* Driver Info (accepted/started) */}
        {ride.driver_id && (ride.status === 'accepted' || ride.status === 'started') && (
          <View style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>D</Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driverName}</Text>
                <View style={styles.driverRating}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.driverRatingText}>
                    {driverRating ?? 'New'} · {driverTrips} {driverTrips === 1 ? 'trip' : 'trips'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.callButton} onPress={handleCallDriver}>
                <Ionicons name="call" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.driverDetails}>
              <View style={styles.driverDetailItem}>
                <Ionicons name="car-sport" size={18} color="#666" />
                <Text style={styles.driverDetailText}>{vehicleNumber}</Text>
              </View>
              <View style={styles.driverDetailItem}>
                <Ionicons name="color-palette" size={18} color="#666" />
                <Text style={styles.driverDetailText}>{vehicleType}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Trip Details */}
        <View style={styles.tripCard}>
          <Text style={styles.tripCardTitle}>Trip Details</Text>

          {/* Locations */}
          <View style={styles.locationsContainer}>
            <View style={styles.locationDots}>
              <View style={styles.pickupDot} />
              <View style={styles.routeLine} />
              <View style={styles.dropoffDot} />
            </View>

            <View style={styles.locations}>
              <View style={styles.locationItem}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.locationText}>{ride.pickup_location}</Text>
              </View>

              {ride.dropoff_location && (
                <View style={styles.locationItem}>
                  <Text style={styles.locationLabel}>Dropoff</Text>
                  <Text style={styles.locationText}>{ride.dropoff_location}</Text>
                </View>
              )}
            </View>
          </View>

          {/* OTP Display */}
          <View style={styles.otpContainer}>
            <View style={styles.otpHeader}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
              <Text style={styles.otpLabel}>Your Ride OTP</Text>
            </View>
            <Text style={styles.otpNumber}>{displayOtp}</Text>
            <Text style={styles.otpHint}>Share this OTP with your driver</Text>
          </View>

          {/* Fare Details */}
          <View style={styles.fareContainer}>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Total Fare</Text>
              <Text style={styles.fareAmount}>₹{ride.fare.toFixed(2)}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareSubLabel}>Payment</Text>
              <Text style={styles.fareSubValue}>Cash to driver</Text>
            </View>
          </View>
        </View>

        {/* Rating Section (completed/cancelled after start) */}
        {showRating && (
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Rate Your Ride</Text>
            <Text style={styles.ratingSubtitle}>How was your experience?</Text>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= rating ? '#F59E0B' : '#CCC'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.submitRatingButton}
              onPress={handleSubmitRating}
            >
              <Text style={styles.submitRatingText}>Submit Rating</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      {(ride.status === 'pending' || ride.status === 'accepted' || ride.status === 'started') && (
        <View style={styles.bottomActions}>
          {ride.status === 'started' && (
            <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
              <Ionicons name="warning" size={20} color="#FFF" />
              <Text style={styles.sosButtonText}>SOS</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.cancelButton, ride.status === 'started' && { flex: 1 }]}
            onPress={handleCancel}
          >
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={styles.cancelButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mapContainer: {
    width: width,
    height: width * 0.8,
    backgroundColor: '#E0E0E0',
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
  },
  mapPlaceholderText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#999',
    marginTop: Spacing.md,
  },
  mapPlaceholderHint: {
    fontSize: FontSizes.sm,
    color: '#BBB',
    marginTop: Spacing.xs,
  },
  mapOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: Spacing.md,
    right: Spacing.md,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    marginLeft: Spacing.xs,
  },
  etaBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  etaText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  statusSection: {
    backgroundColor: '#FFF',
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  statusTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: '#000',
    marginBottom: Spacing.xs,
  },
  statusSubtitle: {
    fontSize: FontSizes.md,
    color: '#666',
    marginBottom: Spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: Spacing.md,
  },
  driverCard: {
    backgroundColor: '#FFF',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    fontSize: 24,
    fontWeight: FontWeights.bold,
    color: '#FFF',
  },
  driverInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  driverName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#000',
    marginBottom: 4,
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverRatingText: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginLeft: 4,
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  driverDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverDetailText: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginLeft: Spacing.xs,
  },
  tripCard: {
    backgroundColor: '#FFF',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tripCardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#000',
    marginBottom: Spacing.md,
  },
  locationsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  locationDots: {
    width: 20,
    alignItems: 'center',
    paddingTop: 8,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  routeLine: {
    width: 3,
    flex: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
  },
  dropoffDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F44336',
  },
  locations: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  locationItem: {
    marginBottom: Spacing.md,
  },
  locationLabel: {
    fontSize: FontSizes.xs,
    color: '#999',
    marginBottom: 4,
  },
  locationText: {
    fontSize: FontSizes.md,
    color: '#000',
    fontWeight: FontWeights.medium,
  },
  otpContainer: {
    backgroundColor: '#F3E8FF',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  otpLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
  },
  otpNumber: {
    fontSize: 40,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    textAlign: 'center',
    letterSpacing: 12,
    marginVertical: Spacing.sm,
  },
  otpHint: {
    fontSize: FontSizes.xs,
    color: '#7C3AED',
    textAlign: 'center',
  },
  fareContainer: {
    backgroundColor: '#F8F9FA',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  fareLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#000',
  },
  fareAmount: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  fareSubLabel: {
    fontSize: FontSizes.sm,
    color: '#666',
  },
  fareSubValue: {
    fontSize: FontSizes.sm,
    color: '#000',
    fontWeight: FontWeights.medium,
  },
  ratingCard: {
    backgroundColor: '#FFF',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ratingTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: '#000',
    marginBottom: Spacing.xs,
  },
  ratingSubtitle: {
    fontSize: FontSizes.md,
    color: '#666',
    marginBottom: Spacing.lg,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  starButton: {
    padding: Spacing.xs,
  },
  submitRatingButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  submitRatingText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#FFF',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: Spacing.sm,
  },
  sosButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  sosButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#FFF',
    marginLeft: Spacing.xs,
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  paymentButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  cancelButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#EF4444',
    marginLeft: Spacing.xs,
  },
  scheduledCard: {
    backgroundColor: '#FFF',
    margin: Spacing.md,
    padding: Spacing.xxl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduledTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: '#000',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  scheduledDate: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  scheduledInfo: {
    fontSize: FontSizes.md,
    color: '#666',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  viewDetailsButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  viewDetailsText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#FFF',
  },
});
