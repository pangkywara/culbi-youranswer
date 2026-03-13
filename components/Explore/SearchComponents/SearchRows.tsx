import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MapPin, Buildings, NavigationArrow, Clock, X } from 'react-native-phosphor';

// Base Icon Component
export const DestinationIcon = ({ type, color, bg }: { type: string; color: string; bg: string }) => {
  const icons: Record<string, any> = { city: Buildings, navigation: NavigationArrow, pin: MapPin, history: Clock };
  const IconComp = icons[type] || MapPin;
  return (
    <View style={[styles.destIconBox, { backgroundColor: bg }]}>
      <IconComp size={22} color={color} weight="regular" />
    </View>
  );
};

// Generic Row for better reusability
export const SearchRow = ({ title, subtitle, iconType, iconColor, iconBg, onPress, rightElement }: any) => (
  <Pressable style={styles.destRow} onPress={onPress}>
    <DestinationIcon type={iconType} color={iconColor} bg={iconBg} />
    <View style={styles.textWrap}>
      <Text style={styles.name}>{title}</Text>
      <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text>
    </View>
    {rightElement}
  </Pressable>
);

const styles = StyleSheet.create({
  destRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 14 },
  destIconBox: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  textWrap: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#222' },
  sub: { fontSize: 13, color: '#717171', marginTop: 2 },
});