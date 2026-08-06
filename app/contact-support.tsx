import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { Button } from '../src/components/common/Button';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';

const TOPICS = ['Trip issue', 'Payment', 'Lost item', 'Safety', 'Account', 'Other'] as const;

export default function ContactSupportScreen() {
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>('Trip issue');
  const [tripId, setTripId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const submit = () => {
    if (message.trim().length < 10) {
      Alert.alert('Add more detail', 'Please describe your issue in at least a few sentences.');
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      Alert.alert(
        'Ticket created',
        `Thanks! Support ticket #JK-${Math.floor(10000 + Math.random() * 90000)} was created for “${topic}”.\n\nThis is a demo — no message was sent.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setMessage('');
              setTripId('');
            },
          },
        ]
      );
    }, 700);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Contact Support" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="headset" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.heroTitle}>We’re here to help</Text>
            <Text style={styles.heroSub}>
              Average reply time under 15 minutes · 6 AM – 11 PM IST
            </Text>
          </View>

          <View style={styles.quickActions}>
            <QuickAction
              icon="call-outline"
              label="Call us"
              onPress={() => Alert.alert('Call support', 'Demo number: +91 1800-000-JKTX')}
            />
            <QuickAction
              icon="logo-whatsapp"
              label="WhatsApp"
              onPress={() => Alert.alert('WhatsApp', 'Demo chat link — not connected.')}
            />
            <QuickAction
              icon="mail-outline"
              label="Email"
              onPress={() => Alert.alert('Email', 'support@jktaxi.app (demo)')}
            />
          </View>

          <Text style={styles.label}>Topic</Text>
          <View style={styles.topicRow}>
            {TOPICS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.topicChip, topic === t && styles.topicChipActive]}
                onPress={() => setTopic(t)}
              >
                <Text style={[styles.topicText, topic === t && styles.topicTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Trip ID (optional)</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="receipt-outline" size={18} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="e.g. ride UUID from My Rides"
              placeholderTextColor="#999"
              value={tripId}
              onChangeText={setTripId}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>How can we help?</Text>
          <View style={[styles.inputWrap, styles.textAreaWrap]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe what happened, when, and what you need…"
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
            />
          </View>

          <Button
            title={sending ? 'Sending…' : 'Submit ticket'}
            onPress={submit}
            loading={sending}
            disabled={sending}
            fullWidth
            style={{ marginTop: Spacing.md }}
          />

          <Text style={styles.disclaimer}>
            Demo mode: tickets are not delivered to a real inbox. For production, this will open your
            support CRM.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickBtn} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={22} color={Colors.primary} />
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: 40 },
  hero: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.ink },
  heroSub: {
    fontSize: FontSizes.sm,
    color: Colors.inkMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  quickBtn: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 6,
  },
  quickLabel: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.ink },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.ink,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  topicChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '18',
  },
  topicText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.inkSecondary },
  topicTextActive: { color: Colors.primary },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  textAreaWrap: { alignItems: 'flex-start', paddingVertical: Spacing.sm },
  input: { flex: 1, fontSize: FontSizes.md, color: Colors.ink, paddingVertical: 12 },
  textArea: { minHeight: 120, paddingTop: 4 },
  disclaimer: {
    marginTop: Spacing.md,
    fontSize: FontSizes.xs,
    color: Colors.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
