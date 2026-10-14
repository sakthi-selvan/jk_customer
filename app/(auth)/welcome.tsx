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
        <View style={styles.brandPanel}>
          <Image
            source={require('../../assets/images/splash.png')}
            style={styles.logo}
            resizeMode="cover"
            accessibilityLabel="JK Taxi"
          />
        </View>

        <View style={styles.successMark}>
          <Ionicons name="checkmark" size={26} color={Colors.white} />
        </View>

        <Text style={styles.eyebrow}>ACCOUNT READY</Text>
        <Text style={styles.title}>Welcome, {firstName}.</Text>
        <Text style={styles.subtitle}>Your JK Taxi account is ready when you are.</Text>

        <View style={styles.perks}>
          <View style={styles.perkRow}>
            <Ionicons name="navigate-outline" size={18} color={Colors.primary} />
            <Text style={styles.perkText}>Follow your ride live</Text>
          </View>
          <View style={styles.perkDivider} />
          <View style={styles.perkRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
            <Text style={styles.perkText}>Trip updates and driver details</Text>
          </View>
          <View style={styles.perkDivider} />
          <View style={styles.perkRow}>
            <Ionicons name="car-outline" size={18} color={Colors.primary} />
            <Text style={styles.perkText}>Choose a ride that fits</Text>
          </View>
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
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingBottom: Spacing.md,
  },
  brandPanel: {
    width: 144,
    height: 144,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.primary,
    marginBottom: Spacing.xl,
  },
  logo: { width: '100%', height: '100%' },
  successMark: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    marginBottom: Spacing.md,
  },
  eyebrow: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: Spacing.xl,
  },
  perks: {
    width: '100%',
    maxWidth: 340,
    paddingHorizontal: Spacing.md,
  },
  perkRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  perkDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  perkText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.ink,
  },
  footer: { width: '100%', maxWidth: 440, alignSelf: 'center', paddingBottom: Spacing.lg },
});
