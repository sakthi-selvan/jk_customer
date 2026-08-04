import React, { useState, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, ScrollView, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  title,
  showBack = false,
}) => {
  const { user } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuSlideAnim = useRef(new Animated.Value(-320)).current;

  const toggleMenu = () => {
    const toValue = menuOpen ? -320 : 0;
    Animated.spring(menuSlideAnim, {
      toValue,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    setMenuOpen(!menuOpen);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {showBack ? (
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#000000" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.headerButton} onPress={toggleMenu}>
            <Ionicons name="menu" size={28} color="#000000" />
          </TouchableOpacity>
        )}

        {title && <Text style={styles.headerTitle}>{title}</Text>}

        <View style={styles.headerButton} />
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>

      {/* Side Menu Drawer */}
      <Animated.View
        style={[
          styles.menuDrawer,
          { transform: [{ translateX: menuSlideAnim }] },
        ]}
      >
        <View style={styles.menuHeader}>
          <View style={styles.menuHeaderContent}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {(user?.name || 'G').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.menuUserName}>{user?.name || 'Guest'}</Text>
              <Text style={styles.menuUserPhone}>{user?.phone || 'Not logged in'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={toggleMenu} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.menuContent}>
          {user?.ride_otp && (
            <View style={styles.menuOtpCard}>
              <View style={styles.otpHeader}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
                <Text style={styles.menuOtpLabel}>Your Ride OTP</Text>
              </View>
              <Text style={styles.menuOtpNumber}>{user.ride_otp}</Text>
              <Text style={styles.otpSubtext}>Share with driver to start ride</Text>
            </View>
          )}

          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>MAIN MENU</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                toggleMenu();
                router.push('/');
              }}
            >
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="home" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Home</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                toggleMenu();
                router.push('/rides');
              }}
            >
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="list" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>My Rides</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                toggleMenu();
                router.push('/profile');
              }}
            >
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="person" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>OTHER</Text>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="card" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Payment Methods</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="gift" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Offers & Promos</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="help-circle" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemIconContainer}>
                <Ionicons name="settings" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Settings</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              toggleMenu();
              // Handle logout
            }}
          >
            <Ionicons name="log-out" size={24} color="#E74C3C" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* Overlay */}
      {menuOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleMenu}
        />
      )}
    </SafeAreaView>
  );
};

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
    zIndex: 100,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: '#000000',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  menuDrawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 320,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10000,
  },
  menuHeader: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  menuHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: FontWeights.bold,
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  menuUserName: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  menuUserPhone: {
    fontSize: FontSizes.md,
    color: '#FFFFFF',
    opacity: 0.95,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: Spacing.md,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  menuOtpCard: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  menuOtpLabel: {
    fontSize: FontSizes.sm,
    color: Colors.success,
    fontWeight: FontWeights.bold,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuOtpNumber: {
    fontSize: 36,
    fontWeight: FontWeights.bold,
    color: Colors.success,
    letterSpacing: 12,
    textAlign: 'center',
    marginVertical: Spacing.sm,
  },
  otpSubtext: {
    fontSize: FontSizes.xs,
    color: '#2E7D32',
    textAlign: 'center',
    opacity: 0.8,
  },
  menuSection: {
    marginTop: Spacing.lg,
    backgroundColor: '#FFFFFF',
  },
  menuSectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: '#999',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: '#F8F9FA',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuItemText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: '#333333',
    fontWeight: FontWeights.medium,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: '#FFF5F5',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutButtonText: {
    fontSize: FontSizes.md,
    color: '#E74C3C',
    fontWeight: FontWeights.semibold,
    marginLeft: Spacing.sm,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
  },
});
