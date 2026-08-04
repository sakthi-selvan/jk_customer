import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

type Props = {
  size?: 'small' | 'large';
  color?: string;
};

export const LoadingAnimation: React.FC<Props> = ({
  size = 'large',
  color = Colors.primary,
}) => (
  <View style={styles.wrap}>
    <ActivityIndicator size={size} color={color} />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
