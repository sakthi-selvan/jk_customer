import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Colors, FontWeights, Shadows, BorderRadius } from '../../constants/theme';

type TabKey = 'home' | 'rides' | 'profile';

const TABS: Array<{
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  href: string;
}> = [
  { key: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home', href: '/' },
  { key: 'rides', label: 'My Rides', icon: 'time-outline', iconActive: 'time', href: '/rides' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person', href: '/profile' },
];

function activeKey(pathname: string): TabKey {
  if (pathname.includes('rides')) return 'rides';
  if (pathname.includes('profile') || pathname.includes('edit-profile')) return 'profile';
  return 'home';
}

interface BottomNavProps {
  hidden?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ hidden }) => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const current = activeKey(pathname || '/');

  if (hidden) return null;

  return (
    <View pointerEvents="box-none" style={styles.anchor}>
      <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }, Shadows.nav]}>
        <View style={styles.bar}>
          {TABS.map((tab) => {
            const active = current === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.item}
                activeOpacity={0.85}
                onPress={() => {
                  if (!active) router.replace(tab.href as any);
                }}
              >
                <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                  <Ionicons
                    name={active ? tab.iconActive : tab.icon}
                    size={22}
                    color={active ? Colors.primary : Colors.inkMuted}
                  />
                </View>
                <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export const BOTTOM_NAV_HEIGHT = 78;

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 80,
  },
  wrap: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: Colors.sheet,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  iconWrap: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.primarySoft,
  },
  label: {
    fontSize: 11,
    fontWeight: FontWeights.medium,
    color: Colors.inkMuted,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: FontWeights.bold,
  },
});
