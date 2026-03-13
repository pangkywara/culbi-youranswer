import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Share,
  Alert,
  Animated,
} from 'react-native';
import { CaretLeft, ShareNetwork, Heart } from 'react-native-phosphor';
import { useRouter } from 'expo-router';

export interface FloatingStickyHeaderProps {
  placeName?: string;
}

export default function FloatingStickyHeader({ placeName }: FloatingStickyHeaderProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);

  const scale = useRef(new Animated.Value(1)).current;
  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;

  const handleHeartPress = () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);

    if (nextLiked) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 0.7, useNativeDriver: true, speed: 50, bounciness: 0 }),
        Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, speed: 30, bounciness: 12 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
      ]).start();

      burstScale.setValue(0.6);
      burstOpacity.setValue(0.7);
      Animated.parallel([
        Animated.timing(burstScale, { toValue: 2.2, duration: 400, useNativeDriver: true }),
        Animated.timing(burstOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.sequence([
        Animated.spring(scale, { toValue: 0.8, useNativeDriver: true, speed: 40, bounciness: 0 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }),
      ]).start();
    }
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `Check out ${placeName ?? 'this amazing cultural destination'} on Culbi!`,
        title: placeName ?? 'Cultural Destination',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
        <View style={styles.content} pointerEvents="box-none">

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <CaretLeft size={22} weight="bold" color="#222" />
          </TouchableOpacity>

          <View style={styles.rightGroup} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onShare}
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <ShareNetwork size={22} color="#222" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={handleHeartPress}
              activeOpacity={1}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <View style={styles.heartWrapper} pointerEvents="none">
                <Animated.View
                  style={[
                    styles.burst,
                    { transform: [{ scale: burstScale }], opacity: burstOpacity },
                  ]}
                />
                <Animated.View style={{ transform: [{ scale }] }}>
                  <Heart
                    size={22}
                    color={isLiked ? '#FF385C' : '#222'}
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
    zIndex: 100, // Pastikan di atas layer lain
  },
  safeArea: {
    width: '100%',
  },
  content: {
    height: 44, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginTop: Platform.OS === 'android' ? 40 : 0, 
  },
  rightGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  heartWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FF385C',
  },
});