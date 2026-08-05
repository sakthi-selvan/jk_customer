import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { Card } from '../../src/components/common/Card';
import { Colors, Spacing, FontSizes, FontWeights } from '../../src/constants/theme';
import { validatePhone, validateName } from '../../src/utils/validation';

export default function EmergencyContactScreen() {
  const { signupDraft, completeProfile, isLoading, error, clearError } = useAuthStore();
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [errors, setErrors] = useState({ emergencyContactName: '', emergencyContactPhone: '' });

  const saveProfile = async (includeEmergency: boolean) => {
    if (!signupDraft?.name) {
      Alert.alert('Missing details', 'Please complete your basic details first.');
      router.replace('/(auth)/register');
      return;
    }

    if (includeEmergency) {
      const next = { emergencyContactName: '', emergencyContactPhone: '' };
      let ok = true;
      if (!validateName(emergencyContactName)) {
        next.emergencyContactName = 'Name must be at least 2 characters';
        ok = false;
      }
      if (!validatePhone(emergencyContactPhone)) {
        next.emergencyContactPhone = 'Please enter a valid 10-digit phone number';
        ok = false;
      }
      setErrors(next);
      if (!ok) return;
    }

    try {
      clearError();
      const ageNum = parseInt(signupDraft.age, 10);
      await completeProfile({
        name: signupDraft.name,
        email: signupDraft.email || undefined,
        age: Number.isNaN(ageNum) ? undefined : ageNum,
        gender: signupDraft.gender || undefined,
        emergencyContactName: includeEmergency ? emergencyContactName : undefined,
        emergencyContactPhone: includeEmergency ? emergencyContactPhone : undefined,
      });
      router.replace('/(auth)/welcome');
    } catch {
      Alert.alert('Error', error || 'Failed to save profile');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.progressRow}>
            <View style={[styles.progressDot, styles.progressDotDone]} />
            <View style={[styles.progressLine, styles.progressLineActive]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
          </View>
          <Text style={styles.stepLabel}>Step 2 of 2</Text>

          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="shield-checkmark" size={28} color={Colors.error} />
            </View>
            <Text style={styles.title}>Emergency contact</Text>
            <Text style={styles.subtitle}>
              Optional — used for SOS alerts during rides. You can skip and add this later.
            </Text>
          </View>

          <Card elevated style={styles.formCard}>
            <Input
              label="Contact Name"
              placeholder="Enter emergency contact name"
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              icon="person-outline"
              error={errors.emergencyContactName}
            />

            <Input
              label="Contact Phone"
              placeholder="Enter 10-digit phone number"
              value={emergencyContactPhone}
              onChangeText={setEmergencyContactPhone}
              keyboardType="phone-pad"
              maxLength={10}
              icon="call-outline"
              error={errors.emergencyContactPhone}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Button
              title="Save & Continue"
              onPress={() => saveProfile(true)}
              loading={isLoading}
              fullWidth
              style={styles.submitButton}
            />

            <Button
              title="Skip for now"
              onPress={() => saveProfile(false)}
              loading={isLoading}
              variant="ghost"
              fullWidth
              style={styles.skipButton}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: Spacing.lg },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D1D5DB',
  },
  progressDotActive: { backgroundColor: Colors.primary },
  progressDotDone: { backgroundColor: Colors.primary },
  progressLine: {
    width: 48,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  progressLineActive: { backgroundColor: Colors.primary },
  stepLabel: {
    textAlign: 'center',
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.sm,
  },
  formCard: { marginBottom: Spacing.lg },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  submitButton: { marginTop: Spacing.md },
  skipButton: { marginTop: Spacing.xs },
});
