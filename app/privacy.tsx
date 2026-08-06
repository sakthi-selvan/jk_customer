import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';

export default function PrivacyScreen() {
  const [shareLiveLocation, setShareLiveLocation] = useState(true);
  const [saveTripHistory, setSaveTripHistory] = useState(true);
  const [personalizedOffers, setPersonalizedOffers] = useState(false);
  const [womenPriority, setWomenPriority] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Privacy & Safety" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Safety</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="navigate-outline"
            title="Share live location with captain"
            subtitle="Only during an active trip"
            value={shareLiveLocation}
            onChange={setShareLiveLocation}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="woman-outline"
            title="Prefer women captains"
            subtitle="When available in your area"
            value={womenPriority}
            onChange={setWomenPriority}
          />
          <View style={styles.divider} />
          <ActionRow
            icon="shield-checkmark-outline"
            title="Trusted contacts"
            subtitle="People who can track your ride"
            onPress={() =>
              Alert.alert('Trusted contacts', 'Add up to 3 contacts who can see your live trip. Demo only.')
            }
          />
          <View style={styles.divider} />
          <ActionRow
            icon="warning-outline"
            title="Emergency SOS"
            subtitle="Quick dial + share location"
            onPress={() =>
              Alert.alert('Emergency SOS', 'In a real trip, SOS would call your emergency contact and JK Taxi safety desk.')
            }
          />
        </View>

        <Text style={styles.sectionLabel}>Data & privacy</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="time-outline"
            title="Save trip history"
            subtitle="Keep past rides on this account"
            value={saveTripHistory}
            onChange={setSaveTripHistory}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="sparkles-outline"
            title="Personalized recommendations"
            subtitle="Use trip patterns for better suggestions"
            value={personalizedOffers}
            onChange={setPersonalizedOffers}
          />
          <View style={styles.divider} />
          <ActionRow
            icon="download-outline"
            title="Download my data"
            subtitle="Request a copy of your account data"
            onPress={() =>
              Alert.alert('Request received', 'We will email a data export within 48 hours. (Demo — nothing is sent.)')
            }
          />
          <View style={styles.divider} />
          <ActionRow
            icon="trash-outline"
            title="Delete account"
            subtitle="Permanently remove your JK Taxi profile"
            destructive
            onPress={() =>
              Alert.alert(
                'Delete account?',
                'This is a demo. Your account will not be deleted. Contact support to delete for real.',
                [{ text: 'Cancel', style: 'cancel' }, { text: 'OK' }]
              )
            }
          />
        </View>

        <Text style={styles.note}>
          JK Taxi never sells your personal data. Location is used only to match captains and for safety
          during trips. These toggles are stored on-device for this demo build.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#D1D5DB', true: Colors.primaryMuted }}
        thumbColor={value ? Colors.primary : '#F3F4F6'}
      />
    </View>
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
