import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { formatApiError, formatApiDetail } from '../src/utils/apiError';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRideStore } from '../src/store/rideStore';
import { useAuthStore } from '../src/store/authStore';
import { Button } from '../src/components/common/Button';
import { RatingModal } from '../src/components/RatingModal';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';
import { Ride } from '../src/types';
const STATUS_CONFIG = {
  pending: {
    color: '#F59E0B',
    bg: '#FEF3C7',
    icon: 'time-outline',
    label: 'Pending',
  },
  accepted: {
    color: '#3B82F6',
    bg: '#DBEAFE',
    icon: 'checkmark-circle-outline',
    label: 'Accepted',
  },
  started: {
    color: Colors.primary,
    bg: Colors.primarySoft,
    icon: 'car-sport-outline',
    label: 'In Progress',
  },
  completed: {
    color: '#10B981',
    bg: '#D1FAE5',
    icon: 'checkmark-done-circle-outline',
    label: 'Completed',
  },
  cancelled: {
    color: '#EF4444',
    bg: '#FEE2E2',
    icon: 'close-circle-outline',
    label: 'Cancelled',
  },
};

export default function RidesScreen() {
  const { activeRide, rideHistory, loadRideHistory, getActiveRide, cancelRide, isLoading } = useRideStore();
  const { user } = useAuthStore();
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingRideId, setRatingRideId] = useState<string | null>(null);
  const [ratedRideIds, setRatedRideIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRides();
  }, []);

  const loadRides = async () => {
    await Promise.all([
      getActiveRide({ silent: Boolean(activeRide) }),
      loadRideHistory({ silent: rideHistory.length > 0 }),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      getActiveRide({ silent: true }),
      loadRideHistory({ silent: true }),
    ]);
    setRefreshing(false);
  };

  const handleSOS = () => {
    if (!user?.emergency_contact_name || !user?.emergency_contact_phone) {
      Alert.alert(
        'Emergency Contact Not Set',
        'Please set up your emergency contact in your profile before using SOS feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => router.push('/profile') },
        ]
      );
      return;
    }

    Alert.alert(
      'Emergency SOS',
      `Your emergency contact:\n${user.emergency_contact_name}\n${user.emergency_contact_phone}\n\nChoose an action:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Call ${user.emergency_contact_name}`,
          onPress: () => {
            Linking.openURL(`tel:${user.emergency_contact_phone}`).catch(() => {
              Alert.alert('Error', 'Unable to make call. Please dial manually.');
            });
          },
        },
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

  const handleCancelRide = (rideId: string) => {
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
              await cancelRide(rideId);
              Alert.alert('Ride Cancelled', 'Your ride has been cancelled successfully.');
              loadRides();
            } catch (error: any) {
              let errorMessage = 'Failed to cancel ride. Please try again.';

              if (error.response?.status === 400) {
                errorMessage = formatApiDetail(error.response.data?.detail, 'This ride cannot be cancelled anymore.');
              } else if (error.response?.status === 404) {
                errorMessage = 'Ride not found. It may have already been cancelled or completed.';
                loadRides();
              }

              Alert.alert('Cancellation Failed', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleRateRide = async (rating: number, comment: string) => {
    if (!ratingRideId) return;

    try {
      const { bookingEnhancedApi } = await import('../src/api/booking-enhanced');
      await bookingEnhancedApi.submitRating(ratingRideId, rating, comment);
      setRatedRideIds((prev) => new Set(prev).add(ratingRideId));
      setRatingModalVisible(false);
      setRatingRideId(null);
      await loadRideHistory({ silent: true });
      Alert.alert('Thank You!', 'Your rating has been submitted successfully');
    } catch (error: any) {
      if (error.response?.status === 409) {
        setRatedRideIds((prev) => new Set(prev).add(ratingRideId));
        setRatingModalVisible(false);
        setRatingRideId(null);
        Alert.alert('Already Rated', 'You have already rated this ride.');
        return;
      }
      Alert.alert('Failed', formatApiError(error, 'Could not submit rating'));
      throw error;
    }
  };

  const isRideRated = (ride: Ride) =>
    Boolean((ride as Ride & { customer_rating?: number | null }).customer_rating) ||
    ratedRideIds.has(ride.id);

  const showRatingPrompt = (ride: Ride) => {
    if (ride.status === 'completed' && !isRideRated(ride)) {
      setRatingRideId(ride.id);
      setRatingModalVisible(true);
    } else if (isRideRated(ride)) {
      Alert.alert('Already Rated', 'You have already rated this ride.');
    }
  };

  const handleViewDetails = (ride: Ride) => {
    if (!ride.driver_id) {
      Alert.alert(
        'Driver Not Assigned',
        'Your ride is waiting to be accepted by a driver. You will be notified once a driver accepts.',
        [{ text: 'OK' }]
      );
      return;
    }

    const driverName = ride.driver?.name || 'Driver';
    const driverPhone = ride.driver?.phone || 'Not available';

    Alert.alert(
      `Driver: ${driverName}`,
      `Phone: ${driverPhone}\n\nRide Status: ${STATUS_CONFIG[ride.status as keyof typeof STATUS_CONFIG]?.label || ride.status}\nFare: ₹${ride.fare.toFixed(2)}\n\nYou can call the driver if needed.`,
      [
        {
          text: 'Call Driver',
          onPress: () => {
            if (ride.driver?.phone) {
              Linking.openURL(`tel:${ride.driver.phone}`).catch(() => {
                Alert.alert('Error', 'Unable to make call. Please dial manually.');
              });
            } else {
              Alert.alert('Not Available', 'Driver phone number is not available');
            }
          },
        },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const RideCard = ({ ride }: { ride: Ride }) => {
    const statusConfig = STATUS_CONFIG[ride.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
    const isActive = ride.status === 'accepted' || ride.status === 'started';

    return (
      <View style={styles.rideCard}>
        {/* Header */}
        <View style={styles.rideHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          <Text style={styles.rideFare}>₹{ride.fare.toFixed(0)}</Text>
        </View>

        {/* Locations */}
        <View style={styles.locationsContainer}>
          <View style={styles.locationDots}>
            <View style={styles.pickupDot} />
            <View style={styles.dashedLine} />
            <View style={styles.dropoffDot} />
          </View>

          <View style={styles.locations}>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {ride.pickup_location}
              </Text>
            </View>

            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>Dropoff</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {ride.dropoff_location}
              </Text>
            </View>
          </View>
        </View>

        {/* Date/Time */}
        <View style={styles.dateTimeRow}>
          <Ionicons name="calendar-outline" size={14} color="#666" />
          <Text style={styles.dateTimeText}>
            {new Date(ride.created_at).toLocaleDateString()} • {new Date(ride.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* Actions */}
        {isActive && (
          <View style={styles.actionsContainer}>
            {ride.driver_id && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleViewDetails(ride)}
              >
                <Ionicons name="call-outline" size={18} color={Colors.primary} />
                <Text style={styles.actionButtonText}>Call Driver</Text>
              </TouchableOpacity>
            )}

            {ride.status === 'started' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.sosButton]}
                onPress={handleSOS}
              >
                <Ionicons name="warning-outline" size={18} color="#FFF" />
                <Text style={[styles.actionButtonText, { color: '#FFF' }]}>SOS</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelRide(ride.id)}
            >
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {ride.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton, { marginTop: Spacing.sm }]}
            onPress={() => handleCancelRide(ride.id)}
          >
            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Cancel Ride</Text>
          </TouchableOpacity>
        )}

        {ride.status === 'completed' && !isRideRated(ride) && (
          <TouchableOpacity
            style={styles.rateButton}
            onPress={() => showRatingPrompt(ride)}
          >
            <Ionicons name="star-outline" size={18} color="#F59E0B" />
            <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Rate This Ride</Text>
          </TouchableOpacity>
        )}

        {ride.status === 'completed' && isRideRated(ride) && (
          <View style={styles.ratedBadge}>
            <Ionicons name="star" size={18} color="#F59E0B" />
            <Text style={[styles.actionButtonText, { color: '#92400E' }]}>
              Rated{(ride as Ride & { customer_rating?: number }).customer_rating
                ? ` · ${(ride as Ride & { customer_rating?: number }).customer_rating}★`
                : ''}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading && !activeRide && rideHistory.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Rides</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Rides</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Active Ride Section */}
        {activeRide && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="radio-button-on" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Active Ride</Text>
            </View>
            <RideCard ride={activeRide} />
          </View>
        )}

        {/* Ride History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.sectionTitle}>Ride History</Text>
          </View>

          {rideHistory.length > 0 ? (
            rideHistory.map((ride) => <RideCard key={ride.id} ride={ride} />)
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="car-outline" size={56} color="#CCC" />
              </View>
              <Text style={styles.emptyText}>No rides yet</Text>
              <Text style={styles.emptySubtext}>Book your first ride to get started</Text>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => router.push('/book-ride')}
              >
                <Text style={styles.bookButtonText}>Book a Ride</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Rating Modal */}
      <RatingModal
        visible={ratingModalVisible}
        onClose={() => {
          setRatingModalVisible(false);
          setRatingRideId(null);
        }}
        onSubmit={handleRateRide}
        rideId={ratingRideId || ''}
      />
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#000',
    marginLeft: Spacing.xs,
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    marginLeft: 4,
  },
  rideFare: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  locationsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  locationDots: {
    width: 20,
    alignItems: 'center',
    paddingTop: 8,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  dashedLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
  },
  dropoffDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F44336',
  },
  locations: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  locationRow: {
    marginBottom: Spacing.sm,
  },
  locationLabel: {
    fontSize: FontSizes.xs,
    color: '#666',
    marginBottom: 2,
  },
  locationText: {
    fontSize: FontSizes.sm,
    color: '#000',
    fontWeight: FontWeights.medium,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dateTimeText: {
    fontSize: FontSizes.xs,
    color: '#666',
    marginLeft: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  actionButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
    marginLeft: 4,
  },
  sosButton: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FEE2E2',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    backgroundColor: '#FEF3C7',
    marginTop: Spacing.sm,
  },
  ratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    marginTop: Spacing.sm,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#000',
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  bookButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  bookButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#FFFFFF',
  },
});
