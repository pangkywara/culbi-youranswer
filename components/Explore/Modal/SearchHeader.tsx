/**
 * components/Explore/Modal/SearchHeader.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Animated search bar used inside SearchSuggestionsView.
 * Renders the back arrow, text input, clear button, and spinner.
 * The shadow fades in once the user scrolls past 10 px.
 */

import React from 'react';
import { View, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { ArrowLeft, X } from 'react-native-phosphor';

export interface SearchHeaderProps {
  query:       string;
  onChange:    (text: string) => void;
  onClear:     () => void;
  onBack:      () => void;
  onSubmit:    () => void;
  isSearching: boolean;
  /** A Reanimated shared value driven by the list's scroll offset. */
  scrollY: SharedValue<number>;
}

export const SearchHeader = ({
  query,
  onChange,
  onClear,
  onBack,
  onSubmit,
  isSearching,
  scrollY,
}: SearchHeaderProps) => {
  const shadowAnim = useAnimatedStyle(() => {
    const scrolled = scrollY.value > 10;
    return {
      backgroundColor: scrolled ? '#FFF' : 'transparent',
      shadowOpacity:   withTiming(scrolled ? 0.12 : 0, { duration: 100 }),
      elevation:       scrolled ? 6 : 0,
    };
  });

  return (
    <Animated.View style={[styles.row, shadowAnim]}>
      <View style={styles.bar}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={22} color="#222" weight="bold" />
        </Pressable>

        <TextInput
          style={styles.input}
          placeholder="Search destinations"
          placeholderTextColor="#717171"
          value={query}
          onChangeText={onChange}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />

        {query.length > 0 && (
          <Pressable onPress={onClear}>
            <View style={styles.clearBtn}>
              <X size={12} color="#FFF" weight="bold" />
            </View>
          </Pressable>
        )}

        {isSearching && (
          <ActivityIndicator size="small" color="#717171" style={{ marginLeft: 4 }} />
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 30 : 20,
    paddingBottom: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    zIndex: 10,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#222',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#AAAAAA',
    justifyContent: 'center',
    alignItems: 'center',
  },
});