import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { CaretLeft, Translate } from 'react-native-phosphor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  onBackPress: () => void;
  onDetailsPress?: () => void;
  showTranslation?: boolean;
}

export const ChatHeader = ({ 
  title, 
  subtitle, 
  onBackPress, 
  onDetailsPress, 
  showTranslation = true 
}: ChatHeaderProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      {/* BACK BUTTON */}
      <TouchableOpacity 
        onPress={onBackPress} 
        style={styles.iconBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <CaretLeft size={24} color="#222" weight="bold" />
      </TouchableOpacity>

      {/* CENTER TITLES */}
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        
        {showTranslation && (
          <View style={styles.translationRow}>
            <Translate size={16} color="#717171" />
            <Text style={styles.translationText}>Translation on</Text>
          </View>
        )}
      </View>

      {/* DETAILS BUTTON */}
      <TouchableOpacity 
        style={styles.detailsBtn} 
        onPress={onDetailsPress}
        activeOpacity={0.7}
      >
        <Text style={styles.detailsText}>Details</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingBottom: 12, // Standard bottom padding
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF' 
  },
  iconBtn: {
    width: 32,
    justifyContent: 'center',
  },
  headerTitleContainer: { 
    flex: 1, 
    alignItems: 'center', 
    paddingHorizontal: 8 
  },
  headerTitle: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#222' 
  },
  headerSubtitle: { 
    fontSize: 11, 
    color: '#717171', 
    marginTop: 2 
  },
  translationRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    marginTop: 4 
  },
  translationText: { 
    fontSize: 11, 
    color: '#717171', 
    textDecorationLine: 'underline' 
  },
  detailsBtn: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#EBEBEB' 
  },
  detailsText: { 
    fontSize: 13, 
    fontWeight: '600' 
  },
});