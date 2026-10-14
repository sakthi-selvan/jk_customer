import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { useAuthStore } from '../src/store/authStore';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';

export default function PrivacyScreen() {
  const user = useAuthStore((state) => state.user);
  const request = async (kind: 'Account deletion' | 'Data export') => {
    const body = `Please process my ${kind.toLowerCase()} request.\nAccount phone: ${user?.phone || ''}\nAccount ID: ${user?.id || ''}`;
    try {
      await Linking.openURL(`mailto:support@jktaxi.app?subject=${encodeURIComponent(`JK Taxi: ${kind}`)}&body=${encodeURIComponent(body)}`);
    } catch {
      Alert.alert('Email support', 'Please send your request to support@jktaxi.app. No request has been sent from this app.');
    }
  };
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Privacy & Safety" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Safety</Text>
        <View style={styles.card}>
          <ActionRow icon="shield-checkmark-outline" title="Emergency contact" subtitle="Update your trusted contact in your profile" onPress={() => router.push('/edit-profile')} />
          <View style={styles.divider} />
          <ActionRow icon="warning-outline" title="Ride safety" subtitle="Use SOS and trip sharing during an active ride" onPress={() => router.push('/')} />
        </View>
        <Text style={styles.sectionLabel}>Your data</Text>
        <View style={styles.card}>
          <ActionRow icon="document-text-outline" title="Privacy policy" subtitle="Read how your information is used" onPress={() => router.push('/terms')} />
          <View style={styles.divider} />
          <ActionRow icon="download-outline" title="Request my data" subtitle="Send a data export request by email" onPress={() => { void request('Data export'); }} />
          <View style={styles.divider} />
          <ActionRow icon="trash-outline" title="Request account deletion" subtitle="Send an account and data deletion request to support" destructive onPress={() => Alert.alert('Request account deletion', 'This opens an email draft. Send the email to request deletion of your account and associated data. Your account is not deleted immediately.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Open email', onPress: () => { void request('Account deletion'); } }])} />
        </View>
        <Text style={styles.note}>Email requests are sent only when you send the draft in your email app. Support must confirm that the request has been processed.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconWrap, destructive && { backgroundColor: '#FEE2E2' }]}>
        <Ionicons name={icon} size={20} color={destructive ? '#EF4444' : Colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, destructive && { color: '#EF4444' }]}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CCC" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: 40 },
  sectionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: 12 },
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
  note: {
    fontSize: FontSizes.sm,
    color: Colors.inkMuted,
    lineHeight: 20,
    marginTop: Spacing.sm,
    paddingHorizontal: 4,
  },
});
