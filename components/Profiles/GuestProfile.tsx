/**
 * components/Profiles/GuestProfile.tsx
 */

import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView 
} from 'react-native';
import { 
  Gear, 
  Question, 
  BookOpen, 
  CaretRight, 
  Cube,
  Binoculars
} from 'react-native-phosphor';
import { Colors, Type, Space, Radius, S } from '@/constants/style';
import LoginModal from './LoginModal';
import { router } from 'expo-router';

export default function GuestProfileScreen() {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header Section */}
        <Text style={styles.title}>Profile</Text>
        
        <View style={styles.heroSection}>
          <Text style={styles.subtitle}>
            Log in and start planning your next trip.
          </Text>

          {/* Auth Action */}
          <TouchableOpacity 
            style={styles.loginBtn} 
            activeOpacity={0.8} 
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.loginBtnText}>Log in or sign up</Text>
          </TouchableOpacity>
        </View>

        
        
        <MenuRow 
          icon={<Gear size={24} color={Colors.textPrimary} weight="regular" />} 
          label="Account settings" 
        />
        <MenuRow 
          icon={<Question size={24} color={Colors.textPrimary} weight="regular" />} 
          label="Get help" 
        />

        {/* Settings Group 2 */}
        <View style={styles.sectionDivider} />
        
      <MenuRow
        icon={<Binoculars size={24} color={Colors.textBody} />}
        label="Landmark Detection (Debug)"
        onPress={() => router.push('/landmark-detection')}
      />
        <MenuRow 
          icon={<BookOpen size={24} color={Colors.textPrimary} weight="regular" />} 
          label="Legal" 
        />
      </ScrollView>

      <LoginModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ── Helper Row Component ─────────────────────────────────────────────────────

const MenuRow = ({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress?: () => void }) => (
  <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={onPress}>
    <View style={styles.rowLeft}>
      {icon}
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    <CaretRight size={20} color={Colors.textPrimary} weight="bold" />
  </TouchableOpacity>
);

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: S.screen,
  content: {
    paddingHorizontal: Space.xxl, // Aligned with BridgeScreen padding
    paddingTop: 60,               // Aligned with BridgeScreen title offset
    paddingBottom: 40,
  },
  title: {
    ...S.display,                 // Using the exact style from your BridgeScreen
  },
  heroSection: {
    marginBottom: Space.sm,
  },
  subtitle: { fontSize: Type.sizeTitle, color: Colors.textSecondary, textAlign: 'left', lineHeight: 24, marginBottom: Space.xxl },
  loginBtn: {
    backgroundColor: Colors.textPrimary,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: Space.xxl,
  },
  loginBtnText: {
    color: Colors.white,
    fontSize: Type.sizeBody,
    fontWeight: Type.weightSemibold,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginTop: Space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Space.xl,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.lg,
  },
  rowLabel: {
    fontSize: 16,
    color: '#222',
    fontWeight: '400',
  },
});