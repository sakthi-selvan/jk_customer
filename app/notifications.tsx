import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';

const STORAGE_KEY = 'jk_notification_prefs';

type Prefs = {
  push: boolean;
  rideUpdates: boolean;
  driverMessages: boolean;
  promotions: boolean;
  smsAlerts: boolean;
  emailReceipts: boolean;
};

const DEFAULTS: Prefs = {
  push: true,
  rideUpdates: true,
  driverMessages: true,
  promotions: false,
  smsAlerts: true,
  emailReceipts: true,
};

type Row = { key: keyof Prefs; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap };

const ROWS: Row[] = [
  { key: 'push', title: 'Push notifications', subtitle: 'Allow JK Taxi to send alerts on this device', icon: 'phone-portrait-outline' },
  { key: 'rideUpdates', title: 'Ride updates', subtitle: 'Captain assigned, arriving, trip started', icon: 'car-outline' },
  { key: 'driverMessages', title: 'Captain messages', subtitle: 'Calls and chat related to your trip', icon: 'chatbubble-ellipses-outline' },
  { key: 'smsAlerts', title: 'SMS alerts', subtitle: 'OTP and critical ride SMS', icon: 'chatbox-outline' },
  { key: 'emailReceipts', title: 'Email receipts', subtitle: 'Trip invoices and payment receipts', icon: 'mail-outline' },
  { key: 'promotions', title: 'Offers & tips', subtitle: 'Discounts, seasonal offers, travel tips', icon: 'pricetag-outline' },
];

export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
      } catch {
        /* keep defaults */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const update = async (key: keyof Prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    if (key === 'push' && !value) {
      next.rideUpdates = false;
      next.driverMessages = false;
      next.promotions = false;
    }
    setPrefs(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Notifications" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Ionicons name="notifications" size={22} color={Colors.primary} />
          <Text style={styles.bannerText}>
            Choose how JK Taxi keeps you updated. Changes apply on this device only (demo).
          </Text>
        </View>

        <View style={styles.card}>
          {ROWS.map((row, idx) => {
            const disabled = row.key !== 'push' && row.key !== 'smsAlerts' && row.key !== 'emailReceipts' && !prefs.push;
            return (
              <View key={row.key}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={[styles.row, disabled && styles.rowDisabled]}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={row.icon} size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowSub}>{row.subtitle}</Text>
                  </View>
                  <Switch
                    value={prefs[row.key]}
                    onValueChange={(v) => update(row.key, v)}
                    disabled={!loaded || disabled}
                    trackColor={{ false: '#D1D5DB', true: Colors.primaryMuted }}
                    thumbColor={prefs[row.key] ? Colors.primary : '#F3F4F6'}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <Text
          style={styles.footerLink}
          onPress={() =>
            Alert.alert('Quiet hours', 'Quiet hours (10 PM – 7 AM) will mute non-critical alerts. Coming soon.')
          }
        >
          Set quiet hours
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: 40 },
  banner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.primarySoft,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  bannerText: { flex: 1, fontSize: FontSizes.sm, color: Colors.inkSecondary, lineHeight: 20 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  rowDisabled: { opacity: 0.45 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: Colors.ink },
  rowSub: { fontSize: FontSizes.sm, color: Colors.inkMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 68 },
  footerLink: {
    marginTop: Spacing.lg,
    textAlign: 'center',
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.md,
  },
});
