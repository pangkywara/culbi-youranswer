/**
 * EditItineraryModal
 *
 * Bottom sheet that appears when the user taps "Edit". Matches Image 3:
 *
 *   ─────────────────────
 *    Edit itinerary     ✕
 *   ─────────────────────
 *   ⊖  [thumb]  Name    ⋮⋮
 *   ⊖  [thumb]  Name    ⋮⋮
 *   ...
 *   ─────────────────────
 *        [ Apply ]
 *
 * Tapping ⊖ removes the stop immediately via onRemove.
 * "Apply" closes the modal.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { X, MinusCircle, DotsSixVertical } from 'react-native-phosphor';
import { Colors, Type, Space, Radius } from '@/constants/style';
import type { TripStop } from '@/components/PastTrips/TripStopRow';

interface EditItineraryModalProps {
  visible: boolean;
  stops: TripStop[];
  onClose: () => void;
  onRemove: (stopOrder: number) => void;
}

export const EditItineraryModal = ({
  visible,
  stops,
  onClose,
  onRemove,
}: EditItineraryModalProps) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent
    onRequestClose={onClose}
  >
    <View style={s.overlay}>
      <View style={s.sheet}>
        {/* Drag handle */}
        <View style={s.handle} />

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Edit itinerary</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={12}>
            <X size={20} color={Colors.textPrimary} weight="bold" />
          </TouchableOpacity>
        </View>

        {/* Stop rows */}
        <ScrollView
          style={s.list}
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={s.listContent}
        >
          {stops.map((stop) => (
            <View key={`edit-${stop.stop_order}`} style={s.row}>
              {/* Remove button */}
              <TouchableOpacity
                onPress={() => onRemove(stop.stop_order)}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <MinusCircle
                  size={24}
                  color={Colors.destructive}
                  weight="fill"
                />
              </TouchableOpacity>

              {/* Thumbnail */}
              <Image
                source={{ uri: stop.landmark.thumbnail_url }}
                style={s.thumb}
                contentFit="cover"
                transition={200}
              />

              {/* Name */}
              <Text style={s.stopName} numberOfLines={2}>
                {stop.landmark.name}
              </Text>

              {/* Drag handle icon */}
              <View style={s.dragHandle}>
                <DotsSixVertical
                  size={20}
                  color={Colors.textTertiary}
                  weight="bold"
                />
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Apply — dark pill */}
        <TouchableOpacity
          style={s.applyBtn}
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Text style={s.applyText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.cardLg,
    borderTopRightRadius: Radius.cardLg,
    paddingHorizontal: Space.xxl,
    paddingTop: Space.md,
    paddingBottom: Platform.OS === 'ios' ? 44 : Space.xxl,
    maxHeight: '82%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  title: {
    fontSize: Type.sizeH3,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: Space.xs,
  },
  list: {
    flexGrow: 0,
    marginTop: Space.xs,
  },
  listContent: {
    paddingBottom: Space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: Space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    flexShrink: 0,
  },
  stopName: {
    flex: 1,
    fontSize: Type.sizeBody,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.1,
  },
  dragHandle: {
    paddingHorizontal: Space.xs,
  },
  applyBtn: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Space.xl,
  },
  applyText: {
    fontSize: Type.sizeTitle,
    fontWeight: '700',
    color: Colors.white,
  },
});
