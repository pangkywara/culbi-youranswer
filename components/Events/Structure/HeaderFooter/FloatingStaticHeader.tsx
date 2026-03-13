import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Platform,
  Text,
  TouchableOpacity,
  Share,
  Animated,
} from 'react-native';
import { CaretLeft, ShareNetwork, Heart } from 'react-native-phosphor';
import { useRouter } from 'expo-router';
import { Colors, Space, Radius, Shadows } from '@/constants/style';
import { useLike } from '@/hooks/useLike';

export interface FloatingStaticHeaderProps {
  placeId: string;
  placeName?: string;
  onShare?: () => void;
}

export default function FloatingStaticHeader({ 
  placeId, 
  placeName, 
  onShare 
}: FloatingStaticHeaderProps) {
  const router = useRouter();
  const { isLiked, toggleLike } = useLike({ placeId: placeId ?? '', placeName });

  const scale = useRef(new Animated.Value(1)).current;
  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;

  const handleHeartPress = () => {
    // We trigger the animation and logic immediately
    if (!isLiked) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.45, friction: 3, tension: 45, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();

      burstScale.setValue(0);
      burstOpacity.setValue(0.5);
      Animated.parallel([
        Animated.timing(burstScale, { toValue: 2.8, duration: 350, useNativeDriver: true }),
        Animated.timing(burstOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    }
    toggleLike();
  };

  const handleDefaultShare = async () => {
    try {
      await Share.share({ message: `Check out ${placeName}!` });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          
          {/* LEFT: Higher zIndex ensures touchability */}
          <View style={[styles.sideColumn, { zIndex: 10 }]}>
            <TouchableOpacity 
              style={styles.iconBtn} 
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <CaretLeft size={20} weight="bold" color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* CENTER */}
          <View style={styles.centerColumn}>
            {placeName && (
              <Text style={styles.title} numberOfLines={1}>
                {placeName}
              </Text>
            )}
          </View>

          {/* RIGHT: Higher zIndex ensures touchability */}
          <View style={[styles.sideColumn, styles.rightBtns, { zIndex: 10 }]}>
            <TouchableOpacity 
              style={styles.iconBtn} 
              onPress={onShare || handleDefaultShare}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ShareNetwork size={20} color={Colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.iconBtn} 
              onPress={handleHeartPress} 
              activeOpacity={1}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.heartWrapper} pointerEvents="none">
                <Animated.View
                  style={[
                    styles.burst,
                    {
                      transform: [{ scale: burstScale }],
                      opacity: burstOpacity,
                    },
                  ]}
                />
                <Animated.View style={{ transform: [{ scale }] }}>
                  <Heart
                    size={20}
                    color={isLiked ? '#FF385C' : Colors.textPrimary}
                    weight={isLiked ? 'fill' : 'regular'}
                  />
                </Animated.View>
              </View>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
    width: '100%',
    zIndex: 100,
  },
  safeArea: {
    width: '100%',
  },
  content: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.md,
    marginTop: Platform.OS === 'android' ? 30 : 0, 
  },
  sideColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerColumn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightBtns: {
    justifyContent: 'flex-end',
    gap: Space.xs,
  },
  iconBtn: {
    width: 44, // Slightly larger touch target
    height: 44,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF385C',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});