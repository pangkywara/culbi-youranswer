import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { S } from '@/constants/style';

interface Props {
  tabs: string[];
  active: string;
  onChange: (v: string) => void;
}

export default function CollectionsTabs({ tabs, active, onChange }: Props) {
  return (
    <View style={S.pillRow}>
      {tabs.map((t) => (
        <TouchableOpacity
          key={t}
          onPress={() => onChange(t)}
          style={[S.pill, active === t && S.pillActive]}
        >
          <Text style={[S.pillText, active === t && S.pillTextActive]}>
            {t}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}