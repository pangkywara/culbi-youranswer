import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Binoculars, Bug, CaretRight, Cube, DoorOpen, Gear, Question, Sparkle } from 'react-native-phosphor';
import { Colors, S, Space, Radius, Type } from '@/constants/style';
import { useAuth } from '@/context/AuthContext';
import { SettingsListSkeleton } from '@/components/UI/Skeleton';

function Item({ icon, label, onPress }: any) {
  return (
    <TouchableOpacity style={S.listItem} onPress={onPress}>
      <View style={S.listItemLeft}>
        {icon}
        <Text style={S.listItemText}>{label}</Text>
      </View>
      <CaretRight size={20} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function SettingsList() {
  const { signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  if (authLoading) {
    return <SettingsListSkeleton />;
  }

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Item icon={<Gear size={24} color={Colors.textBody} />} label="Account settings" />
      <Item icon={<Question size={24} color={Colors.textBody} />} label="Get help" />
      <View style={S.dividerSettings} />
      <Item
        icon={<DoorOpen size={20} color={Colors.textBody} />}
        label="Sign Out"
        onPress={handleSignOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { },
  signOutSection: {
    marginTop: Space.xl,
    paddingBottom: Space.xl,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.card,
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
  },
  signOutText: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightSemibold,
    color: Colors.brand,
  },
});