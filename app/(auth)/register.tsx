import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../src/constants/theme';
import { validateEmail, validateName } from '../../src/utils/validation';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;

export default function CompleteProfileScreen() {
  const draft = useAuthStore((s) => s.signupDraft);
  const setSignupDraft = useAuthStore((s) => s.setSignupDraft);

  const [name, setName] = useState(draft?.name || '');
  const [email, setEmail] = useState(draft?.email || '');
  const [age, setAge] = useState(draft?.age || '');
  const [gender, setGender] = useState(draft?.gender || '');
  const [errors, setErrors] = useState({ name: '', email: '', age: '', gender: '' });

  const validateForm = (): boolean => {
    const next = { name: '', email: '', age: '', gender: '' };
    let ok = true;

    if (!validateName(name)) {
      next.name = 'Name must be at least 2 characters';
      ok = false;
    }
    if (email && !validateEmail(email)) {
      next.email = 'Please enter a valid email address';
      ok = false;
    }
    const ageNum = parseInt(age, 10);
    if (!age || Number.isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      next.age = 'Enter a valid age (13–120)';
      ok = false;
    }
    if (!gender) {
      next.gender = 'Please select your gender';
      ok = false;
    }

    setErrors(next);
    return ok;
  };

  const handleContinue = () => {
    if (!validateForm()) return;
    setSignupDraft({ name: name.trim(), email: email.trim(), age, gender });
    router.push('/(auth)/emergency');
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
                <Text style={styles.stepLabel}>Step 1 of 2</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={styles.progressTrackFill} />
              </View>
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>About you</Text>
              <Text style={styles.subtitle}>Add a few details to set up your rider profile.</Text>
            </View>

            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              icon="person-outline"
              error={errors.name}
            />

            <Input
              label="Email (Optional)"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              error={errors.email}
            />

            <Input
              label="Age"
              placeholder="Your age"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              maxLength={3}
              returnKeyType="done"
              icon="calendar-outline"
              error={errors.age}
            />

            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderChip, gender === g && styles.genderChipActive]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.85}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: gender === g }}
                >
                  <Text style={[styles.genderChipText, gender === g && styles.genderChipTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {!!errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}

            <Button
              title="Continue"
              onPress={handleContinue}
              fullWidth
              style={styles.submitButton}
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  content: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoFrame: {
    width: 58,
    height: 58,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.primary,
  },
  logo: { width: '100%', height: '100%' },
  stepCopy: {
    marginLeft: Spacing.md,
  },
  stepEyebrow: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    marginBottom: 3,
  },
  stepLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    marginLeft: Spacing.md,
    borderRadius: 2,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressTrackFill: {
    width: '50%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  fieldLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  genderChip: {
    width: '48%',
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  genderChipActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(44, 2, 103, 0.06)',
  },
  genderChipText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  genderChipTextActive: { color: Colors.primary },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  submitButton: { marginTop: Spacing.md, marginBottom: Spacing.sm },
});
