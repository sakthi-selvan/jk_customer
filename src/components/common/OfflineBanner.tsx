import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { connectivity } from '../../services/connectivity';
import { Colors, FontSizes, FontWeights, Spacing } from '../../constants/theme';

export const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    connectivity.start();
    return connectivity.subscribe(setOnline);
  }, []);

  if (online) return null;

  return (
    <View style={[styles.banner, { paddingTop: Math.max(insets.top, 8) }]}>
      <Ionicons name="cloud-offline-outline" size={16} color={Colors.white} />
      <Text style={styles.text}>Can't reach JK Taxi servers. Check your connection.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100000,
    backgroundColor: Colors.error,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    flex: 1,
  },
});
