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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { Card } from '../../src/components/common/Card';
import { Colors, Spacing, FontSizes, FontWeights } from '../../src/constants/theme';
import { validatePhone, validateEmail, validateName } from '../../src/utils/validation';

export default function CompleteProfileScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  const { completeProfile, isLoading, error, clearError } = useAuthStore();

  const validateForm = (): boolean => {
    const newErrors = {
      name: '',
      email: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
    };
    let isValid = true;

    if (!validateName(name)) {
      newErrors.name = 'Name must be at least 2 characters';
      isValid = false;
    }

    if (email && !validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (emergencyContactName && !validateName(emergencyContactName)) {
      newErrors.emergencyContactName = 'Name must be at least 2 characters';
      isValid = false;
    }

    if (emergencyContactPhone && !validatePhone(emergencyContactPhone)) {
      newErrors.emergencyContactPhone = 'Please enter a valid 10-digit phone number';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleComplete = async () => {
    if (!validateForm()) return;

    try {
      clearError();
      await completeProfile(name, email, emergencyContactName, emergencyContactPhone);
      router.replace('/');
    } catch (err) {
      Alert.alert('Error', error || 'Failed to save profile');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/jk_taxi_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>Tell us a bit about yourself</Text>
          </View>

          {/* Form */}
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

            {/* Emergency Contact */}
            <View style={styles.emergencySection}>
              <View style={styles.emergencyHeader}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.error} />
                <Text style={styles.emergencySectionTitle}>Emergency Contact (Optional)</Text>
              </View>
              <Text style={styles.emergencySectionSubtitle}>
                For your safety during rides
              </Text>
            </View>

            <Input
              label="Emergency Contact Name"
              placeholder="Enter emergency contact name"
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              icon="person-outline"
              error={errors.emergencyContactName}
            />

            <Input
              label="Emergency Contact Phone"
              placeholder="Enter emergency contact phone"
              value={emergencyContactPhone}
              onChangeText={setEmergencyContactPhone}
              keyboardType="phone-pad"
              maxLength={10}
              icon="call-outline"
              error={errors.emergencyContactPhone}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Button
              title="Get Started"
              onPress={handleComplete}
              loading={isLoading}
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 150,
    height: 100,
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
  },
  formCard: {
    marginBottom: Spacing.lg,
  },
  emergencySection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  emergencySectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginLeft: Spacing.xs,
  },
  emergencySectionSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xl,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
});
