import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Space, S } from '@/constants/style';

export default function ScreenHeader() {
  return (
    <View style={styles.container}>
      <Text style={[S.display, { paddingTop: Space.xxxl }]}>Profile</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 18 },
});