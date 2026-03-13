import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CaretRight } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, S } from '@/constants/style';

// 1. Stat Item Component
export const StatItem = ({ label, value }: { label: string; value: string }) => (
  <View style={S.statItem}>
    <Text style={S.statNumber}>{value}</Text>
    <Text style={S.statLabel}>{label}</Text>
  </View>
);

// 2. Action Card (Grid) Component
export const ActionCard = ({ title, isNew }: { title: string; isNew?: boolean }) => (
  <TouchableOpacity style={styles.gridCard}>
    <View style={styles.imagePlaceholder}>
      <View style={styles.mockImageSmall} />
      {isNew && (
        <View style={S.badgeNewCard}>
          <Text style={S.micro}>NEW</Text>
        </View>
      )}
    </View>
    <Text style={styles.gridCardTitle}>{title}</Text>
  </TouchableOpacity>
);

// 3. Settings List Item
export const SettingItem = ({ icon: Icon, label, showDivider }: any) => (
  <>
    <TouchableOpacity style={S.listItem}>
      <View style={S.listItemLeft}>
        <Icon size={24} color={Colors.textBody} />
        <Text style={S.listItemText}>{label}</Text>
      </View>
      <CaretRight size={20} color={Colors.textTertiary} />
    </TouchableOpacity>
    {showDivider && <View style={S.dividerIndented} />}
  </>
);

const styles = StyleSheet.create({
  gridCard: {
    ...S.card,
    flex: 1,
    alignItems: 'center',
  },
  imagePlaceholder: {
    ...S.cardImagePlaceholder,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockImageSmall: {
    width: '60%',
    height: '60%',
    backgroundColor: Colors.border,
    borderRadius: Radius.md,
  },
  gridCardTitle: {
    fontWeight: Type.weightSemibold,
    fontSize: Type.sizeBody,
    color: Colors.textPrimary,
  },
});