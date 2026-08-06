import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/common/Button';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../src/constants/theme';

export default function WelcomeScreen() {
  const { user, finishWelcome } = useAuthStore();
  const firstName = (user?.name || 'there').split(' ')[0];

  const handleContinue = async () => {
    finishWelcome();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/images/jk_taxi_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.badge}>
          <Ionicons name="checkmark-circle" size={22} color={Colors.success || '#10B981'} />
          <Text style={styles.badgeText}>You're all set</Text>
        </View>

        <Text style={styles.title}>Welcome, {firstName}!</Text>
        <Text style={styles.subtitle}>
          Book cars, autos and bikes across Tiruppur with clear fares and verified drivers.
        </Text>

        <View style={styles.perks}>
          {[
            { icon: 'navigate-outline' as const, text: 'Live tracking on every ride' },
            { icon: 'shield-checkmark-outline' as const, text: 'OTP-protected trips' },
            { icon: 'flash-outline' as const, text: 'Book in seconds' },
          ].map((p) => (
            <View key={p.text} style={styles.perkRow}>
              <View style={styles.perkIcon}>
                <Ionicons name={p.icon} size={18} color={Colors.primary} />
              </View>
              <Text style={styles.perkText}>{p.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button title="Go to Home" onPress={handleContinue} fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  logo: { width: 140, height: 140, marginBottom: Spacing.lg },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  badgeText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#059669',
  },
  title: {
    fontSize: 32,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
    marginBottom: Spacing.xl,
  },
  perks: { width: '100%', maxWidth: 340, gap: 12 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkText: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  footer: { paddingBottom: Spacing.lg },
});
