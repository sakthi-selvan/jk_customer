import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { authApi } from '../src/api/auth';
import { Button } from '../src/components/common/Button';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';

export default function EditProfileScreen() {
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [emergencyContactName, setEmergencyContactName] = useState(
    user?.emergency_contact_name || ''
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    user?.emergency_contact_phone || ''
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }

    if (!emergencyContactName.trim() || !emergencyContactPhone.trim()) {
      Alert.alert(
        'Emergency Contact Required',
        'Emergency contact is mandatory for your safety during rides'
      );
      return;
    }

    if (emergencyContactPhone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid emergency contact phone number');
      return;
    }

    try {
      setIsLoading(true);
      const updatedUser = await authApi.updateProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        emergency_contact_name: emergencyContactName.trim(),
        emergency_contact_phone: emergencyContactPhone.trim(),
      });

      // Update local storage
      const { user: currentUser } = useAuthStore.getState();
      const updatedUserData = { ...currentUser, ...updatedUser };

      // Refresh the auth store
      useAuthStore.setState({ user: updatedUserData });

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Update Failed',
        error.response?.data?.detail || 'Failed to update profile. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={56} color={Colors.primary} />
            </View>
            <TouchableOpacity style={styles.changePhotoButton}>
              <Ionicons name="camera" size={18} color={Colors.primary} />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle-outline" size={24} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your full name"
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={[styles.inputContainer, styles.disabledInput]}>
                  <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: '#999' }]}
                    value={user?.phone}
                    editable={false}
                    placeholderTextColor="#999"
                  />
                  <Ionicons name="lock-closed" size={16} color="#999" />
                </View>
                <Text style={styles.helperText}>Phone number cannot be changed</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email address"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Emergency Contact */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#EF4444" />
              <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>
                Emergency Contact
              </Text>
            </View>

            <View style={[styles.card, styles.emergencyCard]}>
              <View style={styles.alertBanner}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.alertText}>
                  Required for your safety during rides
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Contact Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-add-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={emergencyContactName}
                    onChangeText={setEmergencyContactName}
                    placeholder="e.g., Family member, Friend"
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Contact Phone <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={emergencyContactPhone}
                    onChangeText={setEmergencyContactPhone}
                    placeholder="Enter phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    maxLength={15}
                  />
                </View>
                <Text style={styles.helperText}>
                  This number will be contacted in case of emergency
                </Text>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <Button
              title={isLoading ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              loading={isLoading}
              fullWidth
              disabled={isLoading}
              style={styles.saveButton}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: '#000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.md,
  },
  changePhotoText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
    marginLeft: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#000',
    marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emergencyCard: {
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  alertText: {
    fontSize: FontSizes.sm,
    color: '#1E40AF',
    marginLeft: Spacing.sm,
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: '#000',
    marginBottom: Spacing.sm,
  },
  required: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    opacity: 0.7,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#000',
    paddingVertical: Spacing.md,
  },
  helperText: {
    fontSize: FontSizes.xs,
    color: '#666',
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  buttonContainer: {
    marginTop: Spacing.md,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
});
