import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';

type Tab = 'terms' | 'privacy';

const TERMS = `Last updated: August 1, 2026

1. Acceptance of Terms
By downloading or using the JK Taxi passenger app (“App”), you agree to these Terms of Service. If you do not agree, do not use the App.

2. The Service
JK Taxi connects passengers with independent captains for point-to-point transportation. JK Taxi is a technology platform and is not a transportation carrier unless stated otherwise for a specific product.

3. Accounts
You must provide accurate registration details, keep your Ride OTP confidential, and are responsible for activity under your account. You must be at least 13 years old.

4. Bookings & Fares
Fare estimates shown before booking are indicative. Final fare may include waiting time, tolls, or route changes. Cancellation fees may apply after a captain is assigned.

5. Payments
You agree to pay applicable fares via cash or supported digital methods. Failed payments may restrict future bookings.

6. Conduct
You agree not to misuse the App, harass captains, or attempt to circumvent safety features. We may suspend accounts that violate these Terms.

7. Liability
To the fullest extent permitted by law, JK Taxi’s liability for any claim related to a trip is limited to the fare paid for that trip. We are not liable for indirect or consequential damages.

8. Changes
We may update these Terms. Continued use after changes means you accept the updated Terms.

9. Contact
Questions about these Terms: legal@jktaxi.app (demo address).`;

const PRIVACY = `Last updated: August 1, 2026

1. Information We Collect
• Account: phone, name, email, age, gender, emergency contact
• Trip: pickup/drop, route, timestamps, fare, payment status
• Device: approximate location during trips, app version, crash logs
• Support: messages you send to Contact Support

2. How We Use Information
To match you with captains, calculate fares, process payments, improve safety, prevent fraud, and send trip-related notifications you enable.

3. Sharing
We share trip details with the assigned captain, payment processors as needed, and law enforcement when legally required. We do not sell personal data.

4. Location
Precise location is used during active booking and trips. You can limit some sharing in Privacy & Safety settings.

5. Retention
Trip history is kept while your account is active and as required for legal/accounting purposes. You may request deletion via Contact Support.

6. Your Choices
Update profile data anytime. Control notification preferences. Request a data export or account deletion (demo flows available in-app).

7. Security
We use industry-standard safeguards. No method of transmission is 100% secure; please protect your OTP and device.

8. Contact
privacy@jktaxi.app (demo address)`;

export default function TermsScreen() {
  const [tab, setTab] = useState<Tab>('terms');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Terms & Privacy" />
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'terms' && styles.tabActive]}
          onPress={() => setTab('terms')}
        >
          <Text style={[styles.tabText, tab === 'terms' && styles.tabTextActive]}>Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'privacy' && styles.tabActive]}
          onPress={() => setTab('privacy')}
        >
          <Text style={[styles.tabText, tab === 'privacy' && styles.tabTextActive]}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.body}>{tab === 'terms' ? TERMS : PRIVACY}</Text>
        </View>
        <Text style={styles.footer}>
          This document is sample legal copy for UI preview and is not binding counsel advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: Colors.primarySoft },
  tabText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.inkMuted },
  tabTextActive: { color: Colors.primary },
  content: { padding: Spacing.md, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  body: {
    fontSize: FontSizes.sm,
    color: Colors.inkSecondary,
    lineHeight: 22,
  },
  footer: {
    marginTop: Spacing.md,
    fontSize: FontSizes.xs,
    color: Colors.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
