import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { X } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';

interface EditNavbarProps {
  title: string;
  onClose: () => void;
}

export const EditNavbar = ({ title, onClose }: EditNavbarProps) => (
  <View style={s.navbar}>
    {/* Spacer left — keeps title centered */}
    <View style={s.side} />

    <Text style={s.title} numberOfLines={1}>
      {title}
    </Text>

    <View style={s.side}>
      <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={12}>
        <X size={20} color={Colors.textPrimary} weight="bold" />
      </TouchableOpacity>
    </View>
  </View>
);

const s = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: Space.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    marginTop: Platform.OS === 'android' ? 28 : 0,
  },
  side: {
    width: 40,
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: Type.sizeTitle,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level1,
  },
});
