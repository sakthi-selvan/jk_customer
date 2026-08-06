import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Button } from '../src/components/common/Button';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';
export default function ProfileScreen() {
  const { user, logout, loadUser } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUser();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    iconColor,
    iconBg,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    iconColor?: string;
    iconBg?: string;
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconContainer, { backgroundColor: iconBg || '#F0F9FF' }]}>
        <Ionicons name={icon} size={24} color={iconColor || Colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color={Colors.primary} />
            </View>
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={() => router.push('/edit-profile')}
            >
              <Ionicons name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Guest User'}</Text>
            <Text style={styles.profilePhone}>{user?.phone || 'N/A'}</Text>

            {user?.is_verified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : (
              <View style={styles.unverifiedBadge}>
                <Ionicons name="alert-circle" size={14} color="#F59E0B" />
                <Text style={styles.unverifiedText}>Not Verified</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/edit-profile')}
          >
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Static Ride OTP Card */}
        {user?.ride_otp && (
          <View style={styles.otpCard}>
            <View style={styles.otpHeader}>
              <Ionicons name="key" size={20} color={Colors.primary} />
              <Text style={styles.otpTitle}>Your Ride OTP</Text>
            </View>
            <View style={styles.otpValueContainer}>
              <Text style={styles.otpValue}>{user.ride_otp}</Text>
            </View>
            <Text style={styles.otpDescription}>
              Share this OTP with drivers to start your rides
            </Text>
          </View>
        )}

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.menuSection}>
            <MenuItem
              icon="person-outline"
              title="Edit Profile"
              subtitle="Name, Age, Gender, Email, Emergency Contact"
              onPress={() => router.push('/edit-profile')}
              iconColor="#8B5CF6"
              iconBg="#F3E8FF"
            />

            <View style={styles.menuDivider} />

            <MenuItem
              icon="shield-checkmark-outline"
              title="Emergency Contact"
              subtitle={user?.emergency_contact_name ?
                `${user.emergency_contact_name} • ${user.emergency_contact_phone}` :
                'Not set'}
              onPress={() => router.push('/edit-profile')}
              iconColor="#10B981"
              iconBg="#D1FAE5"
            />

            <View style={styles.menuDivider} />

            <MenuItem
              icon="wallet-outline"
              title="Payment Methods"
              subtitle="Manage payment options"
              onPress={() => Alert.alert('Coming Soon', 'Payment methods will be available soon')}
              iconColor="#3B82F6"
              iconBg="#DBEAFE"
            />
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.menuSection}>
            <MenuItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Push notifications, SMS alerts"
              onPress={() => router.push('/notifications')}
              iconColor="#F59E0B"
              iconBg="#FEF3C7"
            />

            <View style={styles.menuDivider} />

            <MenuItem
              icon="shield-outline"
              title="Privacy & Safety"
              subtitle="Data privacy, security settings"
              onPress={() => router.push('/privacy')}
              iconColor="#EF4444"
              iconBg="#FEE2E2"
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <View style={styles.menuSection}>
            <MenuItem
              icon="help-circle-outline"
              title="Help Center"
              subtitle="FAQs, How-to guides"
              onPress={() => router.push('/help-center')}
              iconColor="#8B5CF6"
              iconBg="#F3E8FF"
            />

            <View style={styles.menuDivider} />

            <MenuItem
              icon="chatbubble-outline"
              title="Contact Support"
              subtitle="Chat with our team"
              onPress={() => router.push('/contact-support')}
              iconColor="#06B6D4"
              iconBg="#CFFAFE"
            />

            <View style={styles.menuDivider} />

            <MenuItem
              icon="document-text-outline"
              title="Terms & Privacy Policy"
              subtitle="Legal information"
              onPress={() => router.push('/terms')}
              iconColor="#6B7280"
              iconBg="#F3F4F6"
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfoCard}>
          <Text style={styles.appName}>JK Taxi</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appCopyright}>© 2026 JK Taxi. All rights reserved.</Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  profileName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#000',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginBottom: Spacing.xs,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: FontSizes.xs,
    color: '#10B981',
    fontWeight: FontWeights.semibold,
    marginLeft: 4,
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  unverifiedText: {
    fontSize: FontSizes.xs,
    color: '#F59E0B',
    fontWeight: FontWeights.semibold,
    marginLeft: 4,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  otpTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#000',
    marginLeft: Spacing.xs,
  },
  otpValueContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  otpValue: {
    fontSize: 32,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    letterSpacing: 8,
  },
  otpDescription: {
    fontSize: FontSizes.sm,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  menuTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#000',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: FontSizes.sm,
    color: '#666',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 76,
  },
  appInfoCard: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.md,
    padding: Spacing.lg,
  },
  appName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: '#000',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: FontSizes.xs,
    color: '#999',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#EF4444',
    marginLeft: Spacing.xs,
  },
});
