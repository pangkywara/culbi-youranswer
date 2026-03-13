import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'react-native-phosphor';
import { useRouter } from 'expo-router';
import { Colors, Space, S } from '@/constants/style';

export default function CollectionsHeader() {

  const router = useRouter();

  return (
    <View style={styles.container}>

      {/* ─── Top Row (Back + Title area) ─── */}
      <View style={S.screenHeaderTopRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={S.screenHeaderBackBtn}
          hitSlop={12}
          activeOpacity={0.7}
        >
          <ArrowLeft size={26} color={Colors.textPrimary} weight="bold" />
        </TouchableOpacity>

        <View style={{ width: 40 }} />
      </View>

      {/* ─── Title Section ─── */}
      <Text style={S.display}>Your Collections</Text>
      <Text style={S.subtitle}>
        Your cultural passport and earned cards
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Space.xl,
    paddingTop: Space.xxxl,
  },
});