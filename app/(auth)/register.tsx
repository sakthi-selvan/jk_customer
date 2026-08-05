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
import { Card } from '../../src/components/common/Card';
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.progressRow}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
          </View>
          <Text style={styles.stepLabel}>Step 1 of 2</Text>

          <View style={styles.header}>
            <Image
              source={require('../../assets/images/jk_taxi_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>About you</Text>
            <Text style={styles.subtitle}>A few details so we can personalize your rides</Text>
          </View>

          <Card elevated style={styles.formCard}>
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
  progressLine: {
    width: 48,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
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
  logo: { width: 140, height: 90, marginBottom: Spacing.sm },
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
  },
  formCard: { marginBottom: Spacing.lg },
  fieldLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  genderChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  genderChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '18',
  },
  genderChipText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  genderChipTextActive: { color: Colors.primary },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  submitButton: { marginTop: Spacing.md },
});
