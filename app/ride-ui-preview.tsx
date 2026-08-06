import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { RideTrackingMap } from '../src/components/map/RideTrackingMap';
import { RideBottomSheet } from '../src/components/ride/RideBottomSheet';
import { Colors, Spacing, FontSizes, FontWeights } from '../src/constants/theme';
import {
  PREVIEW_PHASES,
  PreviewPhase,
  buildNearbyPreviewPins,
  buildPreviewRide,
  DRIVER_START,
  PREVIEW_PICKUP,
  PREVIEW_DROPOFF,
  interpolateLocation,
} from '../src/utils/rideUiPreviewMock';

const PHASE_ORDER: PreviewPhase[] = ['searching', 'accepted', 'started', 'completed'];

/**
 * Local UI walkthrough — does not create a real booking.
 * Uses your device location + OTP 1254 to preview searching → accept → en route → trip → drop.
 */
export default function RideUiPreviewScreen() {
  const [phase, setPhase] = useState<PreviewPhase>('searching');
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 within accepted/started movement
  const [liveEta, setLiveEta] = useState<{ distance: number; duration: number } | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nearbyPins = useMemo(() => buildNearbyPreviewPins(), []);
  const ride = useMemo(() => buildPreviewRide(phase), [phase]);

  const driverLocation = useMemo(() => {
    if (phase === 'searching') return null;
    if (phase === 'accepted') {
      return interpolateLocation(DRIVER_START, PREVIEW_PICKUP, progress);
    }
    if (phase === 'started') {
      return interpolateLocation(PREVIEW_PICKUP, PREVIEW_DROPOFF, progress);
    }
    // completed — at drop
    return { latitude: PREVIEW_DROPOFF.latitude, longitude: PREVIEW_DROPOFF.longitude };
  }, [phase, progress]);

  const mapStatus: 'pending' | 'accepted' | 'started' =
    phase === 'searching' ? 'pending' : phase === 'accepted' ? 'accepted' : 'started';

  const stopPlay = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setPlaying(false);
  };

  const goToPhase = (next: PreviewPhase) => {
    stopPlay();
    setPhase(next);
    setProgress(0);
    setLiveEta(null);
  };

  const playFromHere = () => {
    stopPlay();
    setPlaying(true);
    setProgress(0);
  };

  useEffect(() => {
    if (!playing) return;

    tickRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + 0.02;
        if (next >= 1) {
          const idx = PHASE_ORDER.indexOf(phase);
          if (phase === 'accepted') {
            setPhase('started');
            return 0;
          }
          if (phase === 'started') {
            setPhase('completed');
            stopPlay();
            return 1;
          }
          if (phase === 'searching') {
            setPhase('accepted');
            return 0;
          }
          if (idx < PHASE_ORDER.length - 1) {
            setPhase(PHASE_ORDER[idx + 1]);
            return 0;
          }
          stopPlay();
          return 1;
        }
        return next;
      });
    }, 120);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [playing, phase]);

  // Auto-advance searching after a short beat when playing
  useEffect(() => {
    if (!playing || phase !== 'searching') return;
    const t = setTimeout(() => {
      setPhase('accepted');
      setProgress(0);
    }, 2800);
    return () => clearTimeout(t);
  }, [playing, phase]);

  const onComplete = () => {
    goToPhase('searching');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Ride UI Preview</Text>
          <Text style={styles.headerSub}>Mock walkthrough · OTP {ride.ride_otp}</Text>
        </View>
        <TouchableOpacity
          style={[styles.playBtn, playing && styles.playBtnActive]}
          onPress={() => (playing ? stopPlay() : playFromHere())}
        >
          <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.phaseRow}
        style={styles.phaseScroll}
      >
        {PREVIEW_PHASES.map((p) => {
          const active = p.id === phase;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.phaseChip, active && styles.phaseChipActive]}
              onPress={() => goToPhase(p.id)}
            >
              <Text style={[styles.phaseChipText, active && styles.phaseChipTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.mapWrap}>
        <RideTrackingMap
          key={`preview-${phase}`}
          rideStatus={mapStatus}
          pickupLocation={PREVIEW_PICKUP}
          dropoffLocation={PREVIEW_DROPOFF}
          driverLocation={driverLocation}
          vehicleCategory={ride.vehicle_category}
          nearbyPins={phase === 'searching' ? nearbyPins : undefined}
          onEtaUpdate={(distance, duration) => setLiveEta({ distance, duration })}
        />
      </View>

      <View style={styles.sheetHost} pointerEvents="box-none">
        <RideBottomSheet
          ride={ride}
          liveEta={liveEta}
          nearbyCountOverride={phase === 'searching' ? nearbyPins.length : undefined}
          onRideComplete={onComplete}
        />
      </View>

      <View style={styles.hintBar}>
        <Ionicons name="information-circle-outline" size={16} color="#64748B" />
        <Text style={styles.hintText}>
          {phase === 'searching' && 'Searching: nearby captains on map + contact/cancel sheet'}
          {phase === 'accepted' && 'Accepted: captain moves toward your pickup'}
          {phase === 'started' && 'On trip: captain moves to destination'}
          {phase === 'completed' && 'Dropped: rate the ride (preview only)'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: '#0F172A' },
  headerSub: { fontSize: FontSizes.xs, color: '#64748B', marginTop: 2 },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: { backgroundColor: '#0F172A' },
  phaseScroll: { maxHeight: 52, backgroundColor: '#FFF' },
  phaseRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  phaseChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  phaseChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  phaseChipText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: '#475569' },
  phaseChipTextActive: { color: '#FFF' },
  mapWrap: { flex: 1, minHeight: 280 },
  sheetHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 36,
    height: '48%',
  },
  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  hintText: { flex: 1, fontSize: 12, color: '#64748B', fontWeight: FontWeights.medium },
});
