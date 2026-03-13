import { S } from '@/constants/style';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, NativeSyntheticEvent, TextLayoutEventData } from 'react-native';

export interface DescriptionSectionProps {
  overview?: string;
}

const FALLBACK = 'Discover this cultural destination in the heart of Borneo. This place offers a unique window into the traditions and living heritage of the region.';
const MAX_LINES = 4; // Your truncation threshold

export default function DescriptionSection({ overview }: DescriptionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMoreButton, setShowMoreButton] = useState(false);
  const text = overview ?? FALLBACK;

  /**
   * Checks if the text actually exceeds the max lines allowed.
   * If it does, we show the "Show more" button.
   */
  const onTextLayout = useCallback((e: NativeSyntheticEvent<TextLayoutEventData>) => {
    // Only set this once to avoid infinite loops or jitter
    if (e.nativeEvent.lines.length > MAX_LINES && !isExpanded) {
      setShowMoreButton(true);
    }
  }, [isExpanded]);

  return (
    <View style={styles.container}>
      {/* Main Text Content */}
      <View style={styles.textWrapper}>
        <Text 
          style={styles.descriptionText} 
          numberOfLines={isExpanded ? undefined : MAX_LINES}
          onTextLayout={onTextLayout}
        >
          {text}
        </Text>
      </View>

      {/* Conditionally Render Show More Button */}
      {showMoreButton && (
        <TouchableOpacity 
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.showMoreContainer}
          activeOpacity={0.7}
        >
          <Text style={styles.showMoreText}>
            {isExpanded ? 'Show less' : 'Show more'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
  },
  title: { fontSize: 22, fontWeight: '600', color: '#222', marginBottom: 24 },
  textWrapper: {
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#222',
  },
  showMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
    color: '#222',
  },
  divider: {
    height: 1,
    backgroundColor: '#ebebeb',
    marginTop: 32,
  },
});