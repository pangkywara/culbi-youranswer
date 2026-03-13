import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MinusCircle } from 'react-native-phosphor';
import { Colors, Type, Space } from '@/constants/style';

interface DateGroupHeaderProps {
  label: string;
  onDelete: () => void;
}

export const DateGroupHeader = ({ label, onDelete }: DateGroupHeaderProps) => (
  <View style={s.row}>
    <TouchableOpacity onPress={onDelete} style={s.icon} hitSlop={10}>
      <MinusCircle size={26} color={Colors.destructive} weight="fill" />
    </TouchableOpacity>
    <Text style={s.label}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.xl,
    paddingVertical: Space.md,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  icon: { marginRight: Space.md },
  label: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
  },
});
