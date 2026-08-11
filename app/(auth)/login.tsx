import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { Card } from '../../src/components/common/Card';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../src/constants/theme';
import { validatePhone } from '../../src/utils/validation';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [phoneError, setPhoneError] = useState('');

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const { sendOTP, verifyOTP, otpSent, isLoading, error, clearError, resetOTPState } = useAuthStore();

  const handleSendOTP = async () => {
    setPhoneError('');
    if (!validatePhone(phone)) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return;
    }
    try {
      clearError();
      await sendOTP(phone);
    } catch (err) {
      // error is set in store
    }
  };

  const handleOTPChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (value && index === 3) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 4) {
        handleVerifyOTP(fullOtp);
      }
    }
  };

  const handleOTPKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length !== 4) return;

    try {
      clearError();
      const isNewUser = await verifyOTP(phone, code);
      if (isNewUser) {
        router.replace('/(auth)/register');
      } else {
        router.replace('/');
      }
    } catch (err) {
      setOtp(['', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  const handleChangePhone = () => {
    resetOTPState();
    setOtp(['', '', '', '']);
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
          {/* Logo */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/jk_taxi_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>
              {otpSent ? 'Enter the OTP sent to your phone' : 'Enter your phone number to continue'}
            </Text>
          </View>

          <Card elevated style={styles.formCard}>
            {!otpSent ? (
              <>
                <Input
                  label="Phone Number"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  icon="call-outline"
                  error={phoneError}
                />

                {error && <Text style={styles.errorText}>{error}</Text>}

                <Button
                  title="Send OTP"
                  onPress={handleSendOTP}
                  loading={isLoading}
                  fullWidth
                  style={styles.actionButton}
                />
              </>
            ) : (
              <>
                <View style={styles.phoneDisplay}>
                  <Text style={styles.phoneLabel}>OTP sent to</Text>
                  <Text style={styles.phoneNumber}>+91 {phone}</Text>
                  <Button
                    title="Change"
                    variant="ghost"
                    size="small"
                    onPress={handleChangePhone}
                  />
                </View>

                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { otpRefs.current[index] = ref; }}
                      style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                      value={digit}
                      onChangeText={(value) => handleOTPChange(value.replace(/[^0-9]/g, ''), index)}
                      onKeyPress={({ nativeEvent }) => handleOTPKeyPress(nativeEvent.key, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      autoFocus={index === 0}
                    />
                  ))}
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <Button
                  title="Verify OTP"
                  onPress={() => handleVerifyOTP()}
                  loading={isLoading}
                  fullWidth
                  style={styles.actionButton}
                />

                <Button
                  title="Resend OTP"
                  variant="ghost"
                  onPress={handleSendOTP}
                  style={styles.resendButton}
                />
              </>
            )}
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    width: '82%',
    maxWidth: 320,
    aspectRatio: 1024 / 469,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: Spacing.lg,
  },
  actionButton: {
    marginTop: Spacing.md,
  },
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  phoneLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  phoneNumber: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  otpInput: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: Colors.primary,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  resendButton: {
    marginTop: Spacing.sm,
  },
});
