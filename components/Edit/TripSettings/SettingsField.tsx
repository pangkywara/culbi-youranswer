import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Colors, Type, Space, Radius } from '@/constants/style';

interface SettingsFieldProps extends TextInputProps {
  label: string;
  optional?: boolean;
}

export const SettingsField = ({ label, optional, style, ...rest }: SettingsFieldProps) => (
  <View style={s.wrapper}>
    <View style={s.labelRow}>
      <Text style={s.label}>{label}</Text>
      {optional && <Text style={s.optional}>optional</Text>}
    </View>
    <TextInput
      style={[s.input, rest.multiline && s.inputMultiline, style]}
      placeholderTextColor={Colors.textTertiary}
      {...rest}
    />
  </View>
);

const s = StyleSheet.create({
  wrapper: { gap: Space.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  label: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  optional: {
    fontSize: Type.sizeSmall,
    color: Colors.textTertiary,
    fontWeight: Type.weightNormal,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    fontSize: Type.sizeBody,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceMuted,
  },
  inputMultiline: {
    height: 88,
    textAlignVertical: 'top',
    paddingTop: Space.md,
  },
});
