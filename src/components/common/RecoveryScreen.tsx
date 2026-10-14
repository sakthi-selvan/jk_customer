import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { Button } from './Button';

export function RecoveryScreen({ retry }: { retry: () => void | Promise<void> }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.icon}><Ionicons name="refresh-outline" size={36} color={Colors.primary} /></View>
      <Text style={styles.title}>Let’s try that again</Text>
      <Text style={styles.message}>We couldn’t display this screen. Your booking may still be active. Check My Rides before making another booking.</Text>
      <Button title="Try again" onPress={() => { void retry(); }} fullWidth />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 28, backgroundColor: Colors.background },
  icon: { alignSelf: 'center', padding: 20, borderRadius: 24, backgroundColor: Colors.primarySoft, marginBottom: 24 },
  title: { color: Colors.text, fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  message: { color: Colors.textSecondary, fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: 28 },
});
