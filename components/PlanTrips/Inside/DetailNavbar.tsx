import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
// Add Gear and Robot to your Phosphor imports
import { ArrowLeft, Gear, Robot } from 'react-native-phosphor'; 
import { Colors } from '@/constants/style';
import { styles } from './_styles';

interface DetailNavbarProps {
  title: string;
  isPlanned: boolean;
  onBack: () => void;
  onEdit: () => void;
  onOpenBot?: () => void;
}

export const DetailNavbar = ({
  title,
  isPlanned,
  onBack,
  onEdit,
  onOpenBot,
}: DetailNavbarProps) => (
  <View style={styles.navbar}>
    {/* Back */}
    <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={12}>
      <ArrowLeft size={22} color={Colors.textPrimary} weight="regular" />
    </TouchableOpacity>

    {/* Center title */}
    <View style={styles.navCenter}>
      <Text style={styles.navTitle} numberOfLines={1}>
        {title}
      </Text>
    </View>

    {/* Right actions — Bot + Settings icons */}
    {isPlanned ? (
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {onOpenBot && (
          <TouchableOpacity style={styles.navAction} onPress={onOpenBot} hitSlop={12}>
            <Robot size={22} color={Colors.textPrimary} weight="regular" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.navAction} onPress={onEdit} hitSlop={12}>
          <Gear size={22} color={Colors.textPrimary} weight="regular" />
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.navAction} />
    )}
  </View>
);