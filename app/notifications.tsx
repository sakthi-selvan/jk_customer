import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { Button } from '../src/components/common/Button';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';

export default function NotificationsScreen() {
  const openSettings = async () => {
    try { await Linking.openSettings(); }
    catch { Alert.alert('Open device settings', 'Open Settings, choose JK Taxi, then Notifications to change your notification permissions.'); }
  };
  return <SafeAreaView style={styles.container} edges={['top']}>
    <ScreenHeader title="Notifications" />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.banner}><Ionicons name="notifications" size={22} color={Colors.primary} /><Text style={styles.bannerText}>Manage JK Taxi notification permissions in your device settings.</Text></View>
      <View style={[styles.card, { padding: Spacing.md }]}><Text style={styles.rowTitle}>Stay updated on your ride</Text><Text style={[styles.rowSub, { marginVertical: Spacing.md }]}>Allow notifications to receive available ride alerts. SMS and email communication are managed by the service.</Text><Button title="Open notification settings" onPress={() => { void openSettings(); }} fullWidth /></View>
    </ScrollView>
  </SafeAreaView>;
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
