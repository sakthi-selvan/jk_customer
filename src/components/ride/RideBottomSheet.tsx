import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Animated,
  Dimensions,
  Platform,
  PanResponder,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EnhancedRide } from '../../types/enhanced';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';
import { bookingEnhancedApi } from '../../api/booking-enhanced';
import { useAuthStore } from '../../store/authStore';

const { height } = Dimensions.get('window');
const MIN_HEIGHT = 240;
const MAX_HEIGHT = height * 0.65;

interface RideBottomSheetProps {
  ride: EnhancedRide;
  onRideComplete: () => void;
  liveEta?: { distance: number; duration: number } | null;
}

const CANCEL_REASONS = [
  'Driver is taking too long',
  'Found another ride',
  'Changed my plans',
  'Booked by mistake',
  'Driver asked to cancel',
];

const HELP_LINES = [
  { label: 'Help Line 1', phone: '9677895027', display: '9677 895 027' },
  { label: 'Help Line 2', phone: '9677885027', display: '9677 885 027' },
];

const formatFare = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? `₹${Math.round(value)}` : '—';

const formatDistance = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)} km` : '—';

export const RideBottomSheet: React.FC<RideBottomSheetProps> = ({
  ride,
  onRideComplete,
  liveEta,
}) => {
  const { user } = useAuthStore();
  // Rapido-style: one OTP per user for every ride
  const displayOtp = user?.ride_otp || ride.ride_otp;
  const [nearbyCount, setNearbyCount] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string | null>(null);
  const [customCancelReason, setCustomCancelReason] = useState('');

  const fareDisplay = formatFare(ride.fare);
  const distanceDisplay = formatDistance(ride.distance_km);
  const pickupAddress = ride.pickup_location?.trim() || 'Pickup location';
  const dropoffAddress = ride.dropoff_location?.trim() || '';

  const initialHeight = ride.status === 'pending' ? 340 : MIN_HEIGHT;
  const sheetHeight = useRef(new Animated.Value(initialHeight)).current;
  const lastHeight = useRef(initialHeight);
  const searchPulse = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => { lastHeight.current = (sheetHeight as any)._value; },
      onPanResponderMove: (_, gs) => {
        const h = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, lastHeight.current - gs.dy));
        sheetHeight.setValue(h);
      },
      onPanResponderRelease: (_, gs) => {
        let target;
        if (gs.vy < -0.5) target = MAX_HEIGHT;
        else if (gs.vy > 0.5) target = MIN_HEIGHT;
        else {
          const h = lastHeight.current - gs.dy;
          target = h > (MIN_HEIGHT + MAX_HEIGHT) / 2 ? MAX_HEIGHT : MIN_HEIGHT;
        }
        Animated.spring(sheetHeight, { toValue: target, useNativeDriver: false, tension: 50, friction: 10 }).start();
        lastHeight.current = target;
      },
    })
  ).current;

  // Pulse + radar rings while searching
  useEffect(() => {
    if (ride.status !== 'pending') {
      searchPulse.stopAnimation();
      ring1.stopAnimation();
      ring2.stopAnimation();
      ring3.stopAnimation();
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(searchPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(searchPulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );

    const makeRing = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    pulseLoop.start();
    const r1 = makeRing(ring1, 0);
    const r2 = makeRing(ring2, 600);
    const r3 = makeRing(ring3, 1200);
    r1.start();
    r2.start();
    r3.start();

    return () => {
      pulseLoop.stop();
      r1.stop();
      r2.stop();
      r3.stop();
    };
  }, [ride.status]);

  // Fetch nearby drivers count while searching
  useEffect(() => {
    if (ride.status === 'pending') {
      fetchNearby();
      const interval = setInterval(fetchNearby, 5000);
      return () => clearInterval(interval);
    }
  }, [ride.status]);

  // Show rating on completion
  useEffect(() => {
    if (ride.status === 'completed') setShowRating(true);
  }, [ride.status]);

  const fetchNearby = async () => {
    try {
      const data = await bookingEnhancedApi.getNearbyDrivers();
      setNearbyCount(data.nearby_count);
    } catch {}
  };

  const handleCancel = () => {
    setShowCancelModal(true);
    setSelectedCancelReason(null);
    setCustomCancelReason('');
  };

  const submitCancellation = async () => {
    const reason = selectedCancelReason === 'Other'
      ? customCancelReason.trim()
      : selectedCancelReason;
    if (!reason) {
      Alert.alert('Select a reason', 'Please select why you want to cancel.');
      return;
    }
    try {
      await bookingEnhancedApi.cancelRide(ride.id, reason);
      setShowCancelModal(false);
      Alert.alert('Cancelled', 'Your ride has been cancelled.');
      onRideComplete();
    } catch (e: any) {
      Alert.alert('Failed', e.response?.data?.detail || 'Could not cancel ride.');
    }
  };

  const handleCallDriver = () => {
    if (!ride.driver_phone) {
      Alert.alert('No Driver', 'Driver not assigned yet.');
      return;
    }
    Linking.openURL(`tel:${ride.driver_phone}`).catch(() =>
      Alert.alert('Error', 'Unable to make call.')
    );
  };

  const callHelpLine = (phone: string) => {
    setShowHelpModal(false);
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Error', 'Unable to make call. Please dial manually.')
    );
  };

  const handleSOS = () => {
    Alert.alert(
      'Emergency SOS',
      'This will alert JK Taxi safety ops, dial emergency services, and notify your emergency contact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call 112 + Notify',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await bookingEnhancedApi.triggerSOS(ride.id);
              if (res.emergency_contact_phone) {
                Linking.openURL(`tel:${res.emergency_contact_phone}`).catch(() => undefined);
              }
            } catch {
              // still dial emergency even if API fails
            }
            Linking.openURL('tel:112').catch(() =>
              Alert.alert('Error', 'Unable to dial. Call 112 manually.')
            );
          },
        },
      ]
    );
  };

  const handleShareTrip = async () => {
    try {
      const share = await bookingEnhancedApi.createTripShare(ride.id);
      Alert.alert(
        'Trip Share Link',
        `Share this link with family:\n${share.share_path}\n\n(Token: ${share.share_token})`,
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      Alert.alert('Share failed', e.response?.data?.detail || 'Could not create share link');
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) { Alert.alert('Required', 'Please select a rating.'); return; }
    try {
      await bookingEnhancedApi.submitRating(ride.id, rating);
      Alert.alert('Thank You!', 'Your rating was saved.', [{ text: 'OK', onPress: onRideComplete }]);
    } catch (e: any) {
      Alert.alert('Failed', e.response?.data?.detail || 'Could not submit rating');
    }
  };

  const getStatusConfig = () => {
    switch (ride.status) {
      case 'pending': return { title: 'Searching for Captains', color: '#F59E0B', icon: 'search' };
      case 'accepted': return { title: 'Captain Assigned', color: '#3B82F6', icon: 'checkmark-circle' };
      case 'started': return { title: 'Trip In Progress', color: '#8B5CF6', icon: 'car-sport' };
      case 'completed': return { title: 'Trip Completed', color: '#10B981', icon: 'checkmark-done-circle' };
      case 'cancelled': return { title: 'Trip Cancelled', color: '#EF4444', icon: 'close-circle' };
      default: return { title: 'Unknown', color: '#999', icon: 'help' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <Animated.View style={[styles.container, { height: sheetHeight }]}>
      <View style={styles.dragHandleArea}>
        <View style={styles.dragHandle} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Draggable header */}
        <View {...panResponder.panHandlers} style={styles.headerSection}>
          {/* Status badge + ETA */}
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
              <Ionicons name={statusConfig.icon as any} size={14} color="#FFF" />
              <Text style={styles.statusText}>{statusConfig.title}</Text>
            </View>

            {(ride.status === 'accepted' || ride.status === 'started') && (
              <View style={styles.etaBadge}>
                <Ionicons name="time" size={12} color={Colors.primary} />
                <Text style={styles.etaText}>
                  {liveEta ? `${Math.ceil(liveEta.duration)} min` : `${ride.eta_minutes || '—'} min`}
                </Text>
              </View>
            )}
          </View>

          {/* PENDING STATE */}
          {ride.status === 'pending' && (
            <View style={styles.pendingContainer}>
              <View style={styles.radarWrap}>
                {[ring1, ring2, ring3].map((ring, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.radarRing,
                      {
                        opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
                        transform: [
                          {
                            scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.85] }),
                          },
                        ],
                      },
                    ]}
                  />
                ))}
                <Animated.View
                  style={[
                    styles.pulseCircle,
                    {
                      transform: [
                        {
                          scale: searchPulse.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.94, 1.06],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons name="car-sport" size={28} color={Colors.primary} />
                </Animated.View>
              </View>

              <Text style={styles.pendingTitle}>
                {nearbyCount > 0 ? 'Finding a captain near you' : 'Looking for captains nearby'}
              </Text>
              <Text style={styles.pendingSubtitle}>
                {nearbyCount > 0
                  ? `${nearbyCount} captain${nearbyCount === 1 ? '' : 's'} in range · hang tight`
                  : 'Hang tight — we’re matching you with the nearest captain'}
              </Text>

              <View style={styles.liveStats}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{nearbyCount}</Text>
                  <Text style={styles.statLabel}>Nearby</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{ride.rejection_count || 0}</Text>
                  <Text style={styles.statLabel}>Passed</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: '#F59E0B' }]}>•</Text>
                  <Text style={styles.statLabel}>Searching</Text>
                </View>
              </View>
            </View>
          )}

          {/* ACCEPTED/STARTED - Driver info */}
          {(ride.status === 'accepted' || ride.status === 'started') && (
            <View style={styles.driverSection}>
              <View style={styles.driverRow}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>
                    {(ride.driver_name || 'D').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{ride.driver_name || 'Captain'}</Text>
                  <Text style={styles.driverVehicle}>
                    {ride.driver_vehicle_number || 'Vehicle'} • {ride.driver_vehicle_type || 'Car'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.callButton} onPress={handleCallDriver}>
                  <Ionicons name="call" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>

              {ride.status === 'accepted' && (
                <View style={styles.arrivalBanner}>
                  <Ionicons name="navigate" size={16} color={Colors.primary} />
                  <Text style={styles.arrivalText}>Captain is on the way to pickup</Text>
                </View>
              )}
              {ride.status === 'started' && (
                <View style={[styles.arrivalBanner, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="car-sport" size={16} color={Colors.primary} />
                  <Text style={styles.arrivalText}>You are on your way to destination</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Details */}
        <View style={styles.detailsSection}>
          {/* Locations — pickup first, full address */}
          <View style={styles.locationsCard}>
            <View style={styles.locRow}>
              <View style={[styles.locDot, { backgroundColor: '#4CAF50' }]} />
              <View style={styles.locTextContainer}>
                <Text style={styles.locLabel}>Pickup</Text>
                <Text style={styles.locAddress} numberOfLines={2}>{pickupAddress}</Text>
              </View>
            </View>
            {!!dropoffAddress && (
              <View style={[styles.locRow, { marginBottom: 0 }]}>
                <View style={[styles.locDot, { backgroundColor: '#F44336' }]} />
                <View style={styles.locTextContainer}>
                  <Text style={styles.locLabel}>Dropoff</Text>
                  <Text style={styles.locAddress} numberOfLines={2}>{dropoffAddress}</Text>
                </View>
              </View>
            )}
          </View>

          {/* OTP + Fare + Distance — equal tiles */}
          <View style={styles.infoRow}>
            <View style={[styles.infoTile, styles.otpBox]}>
              <Text style={styles.otpLabel}>OTP</Text>
              <Text style={styles.otpValue} numberOfLines={1}>{displayOtp || '——'}</Text>
            </View>
            <View style={[styles.infoTile, styles.fareBox]}>
              <Text style={styles.fareLabel}>Fare</Text>
              <Text style={styles.fareValue} numberOfLines={1}>{fareDisplay}</Text>
            </View>
            <View style={[styles.infoTile, styles.distBox]}>
              <Text style={styles.distLabel}>Distance</Text>
              <Text style={styles.distValue} numberOfLines={1}>{distanceDisplay}</Text>
            </View>
          </View>

          {/* Rating */}
          {showRating && (
            <View style={styles.ratingSection}>
              <Text style={styles.ratingTitle}>Rate Your Ride</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setRating(s)}>
                    <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={32} color={s <= rating ? '#F59E0B' : '#CCC'} />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitRating}>
                <Text style={styles.submitBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Actions — equal width buttons */}
          {!showRating && ride.status !== 'completed' && ride.status !== 'cancelled' && (
            <View style={styles.actions}>
              {ride.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.contactBtn]}
                  onPress={() => setShowHelpModal(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="call-outline" size={18} color="#166534" />
                  <Text style={styles.contactBtnText}>Contact</Text>
                </TouchableOpacity>
              )}
              {(ride.status === 'accepted' || ride.status === 'started') && (
                <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={handleShareTrip}>
                  <Ionicons name="share-social" size={18} color={Colors.primary} />
                  <Text style={styles.shareBtnText}>Share</Text>
                </TouchableOpacity>
              )}
              {ride.status === 'started' && (
                <TouchableOpacity style={[styles.actionBtn, styles.sosBtn]} onPress={handleSOS}>
                  <Ionicons name="warning" size={18} color="#FFF" />
                  <Text style={styles.sosBtnText}>SOS</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={handleCancel}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Help contact modal — equal call buttons */}
      <Modal visible={showHelpModal} transparent animationType="fade" onRequestClose={() => setShowHelpModal(false)}>
        <View style={styles.cancelModalOverlay}>
          <View style={styles.helpModalContent}>
            <View style={styles.helpModalHeader}>
              <Text style={styles.helpModalTitle}>Contact support</Text>
              <TouchableOpacity
                onPress={() => setShowHelpModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.helpModalHint}>
              Need help while we search? Call our help desk.
            </Text>
            <View style={styles.helpButtons}>
              {HELP_LINES.map((line) => (
                <TouchableOpacity
                  key={line.phone}
                  style={styles.helpCallBtn}
                  onPress={() => callHelpLine(line.phone)}
                  activeOpacity={0.85}
                >
                  <View style={styles.helpCallIcon}>
                    <Ionicons name="call" size={18} color="#FFF" />
                  </View>
                  <View style={styles.helpCallTextContainer}>
                    <Text style={styles.helpCallLabel}>{line.label}</Text>
                    <Text style={styles.helpCallNumber}>{line.display}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Reason Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.cancelModalOverlay}>
          <View style={styles.cancelModalContent}>
            <Text style={styles.cancelModalTitle}>Why are you cancelling?</Text>

            {CANCEL_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[styles.cancelReasonOption, selectedCancelReason === reason && styles.cancelReasonSelected]}
                onPress={() => setSelectedCancelReason(reason)}
              >
                <Ionicons
                  name={selectedCancelReason === reason ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selectedCancelReason === reason ? Colors.primary : '#999'}
                />
                <Text style={[styles.cancelReasonText, selectedCancelReason === reason && { color: Colors.primary }]}>{reason}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.cancelReasonOption, selectedCancelReason === 'Other' && styles.cancelReasonSelected]}
              onPress={() => setSelectedCancelReason('Other')}
            >
              <Ionicons
                name={selectedCancelReason === 'Other' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selectedCancelReason === 'Other' ? Colors.primary : '#999'}
              />
              <Text style={[styles.cancelReasonText, selectedCancelReason === 'Other' && { color: Colors.primary }]}>Other</Text>
            </TouchableOpacity>

            {selectedCancelReason === 'Other' && (
              <TextInput
                style={styles.cancelReasonInput}
                placeholder="Type your reason..."
                placeholderTextColor="#999"
                value={customCancelReason}
                onChangeText={setCustomCancelReason}
                multiline
              />
            )}

            <View style={styles.cancelModalActions}>
              <TouchableOpacity style={styles.cancelModalBack} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.cancelModalBackText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelModalConfirm} onPress={submitCancellation}>
                <Text style={styles.cancelModalConfirmText}>Cancel Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 20,
  },
  scrollContent: { flex: 1 },
  dragHandleArea: { alignItems: 'center', paddingVertical: 8 },
  dragHandle: { width: 40, height: 4, backgroundColor: '#D0D0D0', borderRadius: 2 },
  headerSection: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  detailsSection: { paddingHorizontal: Spacing.lg },

  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexShrink: 1 },
  statusText: { color: '#FFF', fontSize: FontSizes.sm, fontWeight: FontWeights.bold, marginLeft: 6 },
  etaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E8FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  etaText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold, color: Colors.primary, marginLeft: 4 },

  // Pending + radar
  pendingContainer: { alignItems: 'center', paddingVertical: Spacing.sm },
  radarWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  radarRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  pulseCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary + '40',
  },
  pendingTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#111',
    textAlign: 'center',
  },
  pendingSubtitle: {
    fontSize: FontSizes.sm,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    lineHeight: 18,
  },
  liveStats: { flexDirection: 'row', backgroundColor: '#F8F9FA', borderRadius: 12, paddingVertical: 14, paddingHorizontal: Spacing.md, width: '100%' },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.primary, minHeight: 24 },
  statLabel: { fontSize: FontSizes.xs, color: '#666', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E0E0E0', marginHorizontal: 8 },

  // Help modal — equal call buttons
  helpModalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: Spacing.lg, width: '100%' },
  helpModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  helpModalTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: '#000', flex: 1 },
  helpModalHint: { fontSize: FontSizes.sm, color: '#666', marginBottom: Spacing.md, lineHeight: 18 },
  helpButtons: { gap: 10 },
  helpCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  helpCallIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  helpCallTextContainer: { flex: 1 },
  helpCallLabel: { fontSize: FontSizes.xs, color: '#166534', fontWeight: FontWeights.semibold, marginBottom: 2 },
  helpCallNumber: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: '#000', letterSpacing: 0.5 },

  // Driver
  driverSection: { marginBottom: Spacing.sm },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  driverAvatarText: { fontSize: 18, fontWeight: FontWeights.bold, color: '#FFF' },
  driverInfo: { flex: 1, marginLeft: Spacing.md },
  driverName: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: '#000' },
  driverVehicle: { fontSize: FontSizes.sm, color: '#666', marginTop: 2 },
  callButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center' },
  arrivalBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: 8, padding: Spacing.sm, gap: 8 },
  arrivalText: { fontSize: FontSizes.sm, color: '#333', fontWeight: FontWeights.medium },

  // Locations
  locationsCard: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.md },
  locRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  locDot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.md, marginTop: 5 },
  locTextContainer: { flex: 1 },
  locLabel: { fontSize: FontSizes.xs, color: '#999', marginBottom: 2 },
  locAddress: { fontSize: FontSizes.sm, color: '#000', fontWeight: FontWeights.medium, lineHeight: 18 },

  // Equal info tiles
  infoRow: { flexDirection: 'row', marginBottom: Spacing.md, gap: 8 },
  infoTile: {
    flex: 1,
    minHeight: 72,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBox: { backgroundColor: '#F3E8FF', borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed' },
  otpLabel: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: FontWeights.semibold, marginBottom: 4 },
  otpValue: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.primary, letterSpacing: 2 },
  fareBox: { backgroundColor: '#E8F5E9' },
  fareLabel: { fontSize: FontSizes.xs, color: '#4CAF50', fontWeight: FontWeights.semibold, marginBottom: 4 },
  fareValue: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: '#2E7D32' },
  distBox: { backgroundColor: '#E3F2FD' },
  distLabel: { fontSize: FontSizes.xs, color: '#1976D2', fontWeight: FontWeights.semibold, marginBottom: 4 },
  distValue: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: '#1565C0' },

  // Rating
  ratingSection: { alignItems: 'center', marginTop: Spacing.md },
  ratingTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: '#000', marginBottom: Spacing.md },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  submitBtn: { backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 20 },
  submitBtnText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: FontWeights.bold },

  // Equal action buttons
  actions: { flexDirection: 'row', gap: 10, marginTop: Spacing.md },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 6,
    paddingHorizontal: 8,
  },
  contactBtn: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC' },
  contactBtnText: { color: '#166534', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  sosBtn: { backgroundColor: '#EF4444' },
  shareBtn: { backgroundColor: '#F3E8FF', borderWidth: 1, borderColor: Colors.primary },
  shareBtnText: { color: Colors.primary, fontWeight: '700' as const, fontSize: FontSizes.sm },
  sosBtnText: { color: '#FFF', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  cancelBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444' },
  cancelBtnText: { color: '#EF4444', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },

  // Cancel Modal
  cancelModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  cancelModalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: Spacing.lg, width: '100%', maxHeight: '80%' },
  cancelModalTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: '#000', marginBottom: Spacing.md, textAlign: 'center' },
  cancelReasonOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: Spacing.sm, borderRadius: 10, marginBottom: 6, gap: 10 },
  cancelReasonSelected: { backgroundColor: '#F3E8FF' },
  cancelReasonText: { fontSize: FontSizes.md, color: '#333', flex: 1 },
  cancelReasonInput: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: Spacing.md, fontSize: FontSizes.md, color: '#000', minHeight: 60, textAlignVertical: 'top', marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  cancelModalActions: { flexDirection: 'row', gap: 10, marginTop: Spacing.md },
  cancelModalBack: { flex: 1, minHeight: 48, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  cancelModalBackText: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: '#666' },
  cancelModalConfirm: { flex: 1, minHeight: 48, paddingVertical: 12, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  cancelModalConfirmText: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: '#FFF' },
});
