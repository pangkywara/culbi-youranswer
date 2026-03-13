import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { S, Space } from '@/constants/style';

export const HeaderSection = () => (
  <View style={styles.headerContainer}>
    <View style={styles.titleRow}>
      <Text style={S.display}>Trips</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: Space.xxl,
    paddingTop: 60, // Matches the spacing in BridgeScreen
    paddingBottom: Space.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});