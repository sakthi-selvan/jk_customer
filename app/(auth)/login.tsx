import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/common/Button';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../src/constants/theme';
import { validatePhone } from '../../src/utils/validation';

const DEMO_OTP = '1234';

function normalizePhoneInput(value: string) {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.startsWith('91') && digits.length > 10) return digits.slice(2, 12);
  if (digits.startsWith('0') && digits.length === 11) return digits.slice(1);
  return digits.slice(0, 10);
}

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [phoneError, setPhoneError] = useState('');
  const [activeOtpIndex, setActiveOtpIndex] = useState(0);

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const verificationInProgress = useRef(false);
  const demoVerifyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { sendOTP, verifyOTP, otpSent, otpPhone, isLoading, error, clearError, resetOTPState } = useAuthStore();

  useEffect(() => {
    if (otpSent && otpPhone) setPhone(otpPhone);
  }, [otpSent, otpPhone]);

  useEffect(() => () => {
    if (demoVerifyTimeout.current) clearTimeout(demoVerifyTimeout.current);
  }, []);

  const handleSendOTP = async () => {
    setPhoneError('');
    if (!validatePhone(phone)) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return;
    }
    try {
      clearError();
      setOtp(['', '', '', '']);
      await sendOTP(phone);
      setOtp(DEMO_OTP.split(''));
      if (demoVerifyTimeout.current) clearTimeout(demoVerifyTimeout.current);
      demoVerifyTimeout.current = setTimeout(() => {
        demoVerifyTimeout.current = null;
        void handleVerifyOTP(DEMO_OTP);
      }, 650);
    } catch {
      // error is set in store
    }
  };

  const handleOTPChange = (value: string, index: number) => {
    const pendingDemoVerify = demoVerifyTimeout.current;
    const isEditingDemoCode = pendingDemoVerify !== null;
    if (pendingDemoVerify !== null) {
      clearTimeout(pendingDemoVerify);
      demoVerifyTimeout.current = null;
    }
    const newOtp = isEditingDemoCode ? ['', '', '', ''] : [...otp];
    const digits = value.replace(/[^0-9]/g, '').slice(0, 4);
    if (digits.length > 1) {
      digits.split('').forEach((digit, offset) => {
        if (index + offset < newOtp.length) newOtp[index + offset] = digit;
      });
    } else {
      newOtp[index] = digits;
    }
    setOtp(newOtp);
    clearError();

    if (!digits) return;
    const fullOtp = newOtp.join('');
    if (fullOtp.length === 4) {
      otpRefs.current[3]?.blur();
      void handleVerifyOTP(fullOtp);
    } else {
      const nextIndex = Math.min(index + digits.length, newOtp.length - 1);
      otpRefs.current[nextIndex]?.focus();
    }
  };

  const handleOTPKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (!/^\d{4}$/.test(code) || verificationInProgress.current) return;
    if (demoVerifyTimeout.current) {
      clearTimeout(demoVerifyTimeout.current);
      demoVerifyTimeout.current = null;
    }

    verificationInProgress.current = true;
    try {
      clearError();
      const isNewUser = await verifyOTP(phone, code);
      if (isNewUser) {
        router.replace('/(auth)/register');
      } else {
        router.replace('/');
      }
    } catch {
      setOtp(['', '', '', '']);
      setActiveOtpIndex(0);
      otpRefs.current[0]?.focus();
    } finally {
      verificationInProgress.current = false;
    }
  };

  const handleChangePhone = () => {
    if (demoVerifyTimeout.current) {
      clearTimeout(demoVerifyTimeout.current);
      demoVerifyTimeout.current = null;
    }
    resetOTPState();
    setOtp(['', '', '', '']);
    setPhoneError('');
    setActiveOtpIndex(0);
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
            <View style={styles.header}>
              <View style={styles.logoFrame}>
                <Image
                  source={require('../../assets/images/splash.png')}
                  style={styles.logo}
                  resizeMode="cover"
                  accessibilityLabel="JK Taxi"
                />
              </View>
              <Text style={styles.title}>{otpSent ? 'Verify your number' : 'Book your ride'}</Text>
              <Text style={styles.subtitle}>
                {otpSent
                  ? 'Enter the 4-digit code sent to your mobile.'
                  : 'Sign in or create an account with your mobile number.'}
              </Text>
            </View>

            {!otpSent ? (
              <>
                <Text style={styles.fieldLabel}>Mobile number</Text>
                <View style={[styles.phoneInput, phoneError && styles.phoneInputError]}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <View style={styles.phoneDivider} />
                  <TextInput
                    style={styles.phoneNumberInput}
                    value={phone}
                    onChangeText={(value) => {
                      setPhone(normalizePhoneInput(value));
                      if (phoneError) setPhoneError('');
                    }}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    autoComplete="tel-national"
                    textContentType="telephoneNumber"
                    returnKeyType="done"
                    onSubmitEditing={() => void handleSendOTP()}
                    accessibilityLabel="10-digit mobile number"
                  />
                </View>
                {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
                <Text style={styles.helperText}>Choose a saved number suggestion or enter it manually.</Text>
                {error && <Text style={styles.errorText}>{error}</Text>}

                <Button
                  title="Send verification code"
                  onPress={handleSendOTP}
                  loading={isLoading}
                  fullWidth
                  style={styles.actionButton}
                />
              </>
            ) : (
              <>
                <View style={styles.phoneDisplay}>
                  <View style={styles.phoneDisplayCopy}>
                    <Text style={styles.phoneLabel}>Code sent to</Text>
                    <Text style={styles.phoneNumber}>+91 {phone}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changePhoneButton}
                    onPress={handleChangePhone}
                    accessibilityRole="button"
                    accessibilityLabel="Change mobile number"
                  >
                    <Ionicons name="create-outline" size={16} color={Colors.primary} />
                    <Text style={styles.changePhoneText}>Change</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>Verification code</Text>
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { otpRefs.current[index] = ref; }}
                      style={[
                        styles.otpInput,
                        activeOtpIndex === index && styles.otpInputFocused,
                        digit ? styles.otpInputFilled : null,
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOTPChange(value.replace(/[^0-9]/g, ''), index)}
                      onKeyPress={({ nativeEvent }) => handleOTPKeyPress(nativeEvent.key, index)}
                      onFocus={() => setActiveOtpIndex(index)}
                      keyboardType="number-pad"
                      maxLength={index === 0 ? 4 : 1}
                      autoFocus={index === 0}
                      textContentType={index === 0 ? 'oneTimeCode' : 'none'}
                      accessibilityLabel={`Verification digit ${index + 1} of 4`}
                    />
                  ))}
                </View>

                <Text style={styles.helperText}>Demo code 1234 fills automatically; you can also edit it.</Text>
                {error && <Text style={styles.errorText}>{error}</Text>}

                <Button
                  title="Verify and continue"
                  onPress={() => handleVerifyOTP()}
                  loading={isLoading}
                  disabled={otp.join('').length !== 4}
                  fullWidth
                  style={styles.actionButton}
                />

                <View style={styles.resendRow}>
                  <Text style={styles.resendLabel}>Didn’t receive a code?</Text>
                  <TouchableOpacity
                    onPress={handleSendOTP}
                    disabled={isLoading}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.resendText, isLoading && styles.resendTextDisabled]}>
                      Resend
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
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
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoFrame: {
    width: 124,
    height: 124,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    maxWidth: 300,
    fontSize: FontSizes.sm,
    lineHeight: 21,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  phoneInput: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  phoneInputError: {
    borderColor: Colors.error,
  },
  countryCode: {
    minWidth: 44,
    justifyContent: 'center',
  },
  countryCodeText: {
    color: Colors.ink,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginRight: Spacing.md,
  },
  phoneNumberInput: {
    flex: 1,
    height: 56,
    color: Colors.ink,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  helperText: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    lineHeight: 18,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  actionButton: {
    marginTop: Spacing.lg,
  },
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  phoneDisplayCopy: {
    flex: 1,
  },
  phoneLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  phoneNumber: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.ink,
  },
  changePhoneButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm,
  },
  changePhoneText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  otpInput: {
    width: 58,
    height: 62,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.ink,
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
  },
  otpInputFocused: {
    borderColor: Colors.primary,
  },
  otpInputFilled: {
    backgroundColor: Colors.primarySoft,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  resendLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  resendText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },
  resendTextDisabled: {
    opacity: 0.5,
  },
});
