import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, FontWeights } from '../../constants/theme';

interface HeaderProps {
  title: string;
  onMenuPress?: () => void;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onMenuPress,
  showBack = false,
  rightAction,
}) => {
  return (
    <View style={styles.container}>
      {showBack ? (
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
      ) : onMenuPress ? (
        <TouchableOpacity style={styles.button} onPress={onMenuPress}>
          <Ionicons name="menu" size={28} color="#000000" />
        </TouchableOpacity>
      ) : (
        <View style={styles.button} />
      )}

      <Text style={styles.title}>{title}</Text>

      {rightAction ? (
        <View style={styles.button}>{rightAction}</View>
      ) : (
        <View style={styles.button} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
});
