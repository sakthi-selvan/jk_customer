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
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

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

  const filteredHistory = rideHistory.filter((ride) =>
    historyFilter === 'all' || ride.status === historyFilter
  );

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

    const driverName = ride.driver_name || 'Driver';
    const driverPhone = ride.driver_phone || 'Not available';

    Alert.alert(
      `Driver: ${driverName}`,
      `Phone: ${driverPhone}\n\nRide Status: ${STATUS_CONFIG[ride.status as keyof typeof STATUS_CONFIG]?.label || ride.status}\nFare: ₹${ride.fare.toFixed(2)}\n\nYou can call the driver if needed.`,
      [
        {
          text: 'Call Driver',
          onPress: () => {
            if (ride.driver_phone) {
              Linking.openURL(`tel:${ride.driver_phone}`).catch(() => {
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
    const createdAt = new Date(ride.created_at);
    const dateLabel = Number.isNaN(createdAt.getTime())
      ? 'Date unavailable'
      : createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeLabel = Number.isNaN(createdAt.getTime())
      ? ''
      : createdAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

    return (
      <View style={styles.rideCard}>
        <View style={styles.rideHeader}>
          <View style={styles.rideDateBlock}>
            <Text style={styles.rideDateText}>{dateLabel}</Text>
            {!!timeLabel && <Text style={styles.rideTimeText}>{timeLabel}</Text>}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon as any} size={15} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        <View style={styles.locationsContainer}>
          <View style={styles.locationDots}>
            <View style={styles.pickupDot} />
            <View style={styles.dashedLine} />
            <View style={styles.dropoffDot} />
          </View>

          <View style={styles.locations}>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>PICKUP</Text>
              <Text style={styles.locationText} numberOfLines={2}>
                {ride.pickup_location}
              </Text>
            </View>

            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>DROP-OFF</Text>
              <Text style={styles.locationText} numberOfLines={2}>
                {ride.dropoff_location}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rideFooter}>
          <View>
            <Text style={styles.fareCaption}>{ride.status === 'completed' ? 'Total fare' : 'Estimated fare'}</Text>
            <Text style={styles.rideFare}>₹{ride.fare.toFixed(0)}</Text>
          </View>
          {ride.payment_status && (
            <Text style={styles.paymentStatus}>
              {ride.payment_status.replace(/_/g, ' ').toLowerCase()}
            </Text>
          )}
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
          <View style={styles.historyHeading}>
            <View>
              <Text style={styles.sectionTitle}>Ride history</Text>
              <Text style={styles.historyCount}>
                {rideHistory.length} {rideHistory.length === 1 ? 'ride' : 'rides'}
              </Text>
            </View>
          </View>

          {rideHistory.length > 0 ? (
            <>
              <View style={styles.historyFilters}>
                {(['all', 'completed', 'cancelled'] as const).map((filter) => {
                  const selected = historyFilter === filter;
                  const label = filter === 'all' ? 'All' : filter === 'completed' ? 'Completed' : 'Cancelled';
                  return (
                    <TouchableOpacity
                      key={filter}
                      style={[styles.historyFilter, selected && styles.historyFilterSelected]}
                      onPress={() => setHistoryFilter(filter)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.historyFilterText, selected && styles.historyFilterTextSelected]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((ride) => <RideCard key={ride.id} ride={ride} />)
              ) : (
                <View style={styles.filteredEmpty}>
                  <Text style={styles.filteredEmptyText}>No {historyFilter} rides yet</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="receipt-outline" size={30} color={Colors.primary} />
              </View>
              <Text style={styles.emptyText}>Your rides will appear here</Text>
              <Text style={styles.emptySubtext}>Once you book a ride, you can track it and review the details here.</Text>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => router.push('/book-ride')}
                accessibilityRole="button"
              >
                <Text style={styles.bookButtonText}>Book a ride</Text>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFFFFF',
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
    flex: 1,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
    marginLeft: Spacing.sm,
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
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
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
    marginLeft: Spacing.xs,
  },
  historyHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  historyCount: {
    marginTop: 2,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  historyFilters: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    marginBottom: Spacing.md,
    borderRadius: 10,
    backgroundColor: Colors.sheetAlt,
  },
  historyFilter: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
    borderRadius: 8,
  },
  historyFilterSelected: {
    backgroundColor: Colors.primary,
  },
  historyFilterText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  historyFilterTextSelected: {
    color: Colors.white,
  },
  rideCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  rideDateBlock: { flex: 1 },
  rideDateText: {
    color: Colors.ink,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  rideTimeText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    flexShrink: 0,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    marginLeft: 4,
  },
  rideFare: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
  },
  fareCaption: {
    marginBottom: 2,
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
  },
  rideFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  paymentStatus: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    textTransform: 'capitalize',
  },
  locationsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  locationDots: {
    width: 16,
    alignItems: 'center',
    paddingTop: 5,
    paddingBottom: 6,
  },
  pickupDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#0D9488',
  },
  dashedLine: {
    width: 1,
    flex: 1,
    backgroundColor: Colors.borderDark,
    marginVertical: 3,
  },
  dropoffDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#E11D48',
  },
  locations: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  locationRow: {
    marginBottom: Spacing.md,
  },
  locationLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeights.bold,
    marginBottom: 2,
  },
  locationText: {
    fontSize: FontSizes.sm,
    color: Colors.ink,
    fontWeight: FontWeights.medium,
    lineHeight: 19,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filteredEmpty: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  filteredEmptyText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
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
