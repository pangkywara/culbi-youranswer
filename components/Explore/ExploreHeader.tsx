import React from 'react';
import { StyleSheet, View, Pressable, Text, Platform } from 'react-native';
import { ArrowLeft, Sliders } from 'react-native-phosphor';

interface ExploreHeaderProps {
  topInset: number;
  headerHeight: number;
  activeFilter: string | null;
  onBack: () => void;
  onSearchPress: () => void;
  onFilterPress?: () => void; 
}

// Adjust this value to push the header further down
const EXTRA_SPACING = Platform.OS === 'ios' ? 10 : 20; 

export const ExploreHeader = ({ 
  topInset, 
  headerHeight, 
  activeFilter, 
  onBack, 
  onSearchPress,
  onFilterPress
}: ExploreHeaderProps) => {
  return (
    <View 
      style={[
        styles.header, 
        { 
          // Adding EXTRA_SPACING pushes the content row down
          paddingTop: topInset + EXTRA_SPACING, 
          height: headerHeight + EXTRA_SPACING + 10 
        }
      ]} 
      pointerEvents="box-none"
    >
      <View style={styles.contentRow}>
        <Pressable style={styles.iconBtn} onPress={onBack} hitSlop={12}>
          <ArrowLeft size={24} color="#222" weight="regular" />
        </Pressable>

        <Pressable style={styles.searchCard} onPress={onSearchPress}>
          <View style={styles.searchCardInner}>
            <Text 
              style={styles.searchText} 
              numberOfLines={1} 
              ellipsizeMode="tail"
            >
              {activeFilter ?? 'Search destinations…'}
            </Text>
          </View>
        </Pressable>

        <Pressable style={styles.iconBtn} onPress={onFilterPress} hitSlop={12}>
          <Sliders size={24} color="#222" weight="regular" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCard: {
    flex: 1,
    height: 48, 
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  searchCardInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchText: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
    textAlign: 'center',
  },
});