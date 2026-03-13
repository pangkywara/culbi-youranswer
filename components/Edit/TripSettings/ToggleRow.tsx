import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Colors, Type, Space } from '@/constants/style';

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}

export const ToggleRow = ({ label, description, value, onValueChange }: ToggleRowProps) => (
  <View style={s.row}>
    <View style={s.text}>
      <Text style={s.label}>{label}</Text>
      {description && <Text style={s.desc}>{description}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: Colors.border, true: Colors.brand }}
      thumbColor={Colors.white}
    />
  </View>
);

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  text: { flex: 1, paddingRight: Space.xl },
  label: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
  desc: {
    fontSize: Type.sizeBodySm,
    color: Colors.textSecondary,
    marginTop: Space.xxs,
  },
});
