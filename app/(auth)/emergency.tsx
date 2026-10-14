import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { formatApiDetail } from '../../src/utils/apiError';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
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
      Alert.alert('Error', formatApiDetail(error, 'Failed to save profile'));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.topBar}>
              <View style={styles.logoFrame}>
                <Image
                  source={require('../../assets/images/splash.png')}
                  style={styles.logo}
                  resizeMode="cover"
                  accessibilityLabel="JK Taxi"
                />
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepEyebrow}>CREATE YOUR ACCOUNT</Text>
                <Text style={styles.stepLabel}>Step 2 of 2</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={styles.progressTrackFill} />
              </View>
            </View>

            <View style={styles.header}>
              <View style={styles.headingRow}>
                <View style={styles.iconWrap}>
                  <Ionicons name="shield-checkmark" size={22} color={Colors.primary} />
                </View>
                <View style={styles.headingCopy}>
                  <Text style={styles.title}>Emergency contact</Text>
                  <Text style={styles.optionalLabel}>Optional</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                Add someone we can contact if you need help during a ride. You can skip this and add it later.
              </Text>
            </View>

            <Input
              label="Contact name"
              placeholder="Enter emergency contact name"
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              icon="person-outline"
              error={errors.emergencyContactName}
            />

            <Input
              label="Contact phone"
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
              title="Add contact and continue"
              onPress={() => saveProfile(true)}
              loading={isLoading}
              fullWidth
              style={styles.submitButton}
            />

            <Button
              title="Skip this step"
              onPress={() => saveProfile(false)}
              loading={isLoading}
              variant="ghost"
              fullWidth
              style={styles.skipButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  logoFrame: { width: 58, height: 58, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.primary },
  logo: { width: '100%', height: '100%' },
  stepCopy: { marginLeft: Spacing.md },
  stepEyebrow: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: FontWeights.bold, marginBottom: 3 },
  progressTrack: { flex: 1, height: 4, marginLeft: Spacing.md, borderRadius: 2, backgroundColor: Colors.border, overflow: 'hidden' },
  progressTrackFill: { width: '100%', height: '100%', borderRadius: 2, backgroundColor: Colors.primary },
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  headingCopy: { flex: 1, marginLeft: Spacing.md },
  optionalLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  stepLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  header: { marginBottom: Spacing.lg },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(44, 2, 103, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  submitButton: { marginTop: Spacing.md },
  skipButton: { marginTop: Spacing.xs, marginBottom: Spacing.sm },
});
