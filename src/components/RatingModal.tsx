import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './common/Button';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../constants/theme';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  rideId: string;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  onClose,
  onSubmit,
  rideId,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(rating, comment);
      setRating(0);
      setComment('');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    setRating(0);
    setComment('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="star" size={32} color={Colors.warning} />
            <Text style={styles.title}>Rate Your Ride</Text>
            <Text style={styles.subtitle}>How was your experience?</Text>
          </View>

          {/* Star Rating */}
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={48}
                  color={star <= rating ? Colors.warning : Colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Rating Labels */}
          <View style={styles.ratingLabels}>
            <Text style={styles.ratingLabel}>Poor</Text>
            <Text style={styles.ratingLabel}>Excellent</Text>
          </View>

          {/* Comment Input */}
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Additional Comments (Optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience..."
              placeholderTextColor={Colors.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.characterCount}>{comment.length}/500</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Button
              title="Skip"
              variant="outline"
              onPress={handleSkip}
              style={styles.button}
            />
            <Button
              title="Submit"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={rating === 0}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  starButton: {
    padding: Spacing.xs,
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
  },
  ratingLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  commentSection: {
    marginBottom: Spacing.xl,
  },
  commentLabel: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  commentInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
  },
});
