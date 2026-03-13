/**
 * app/onboarding/index.tsx
 */
import React, { useRef, useState } from 'react';
import { View, StyleSheet, FlatList, Dimensions, StatusBar } from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/style';
import { useAuth } from '@/context/AuthContext';
import { SLIDES } from '@/components/Onboarding/data';
import { OnboardingSlide } from '@/components/Onboarding/OnboardingSlides';

const { width: SCREEN_W } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInWithGoogle, signingIn, markGuestOnboarded } = useAuth();
  
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);
  
  // This state is the "Trigger" for the video reset in the child component
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => { 
      scrollX.value = e.contentOffset.x; 
    },
  });

  /**
   * Navigates to a specific slide and updates the active index.
   * The activeIndex change triggers the useEffect in OnboardingSlide to restart the video.
   */
  const goToSlide = (index: number) => {
    if (index < 0 || index >= SLIDES.length) return;

    flatListRef.current?.scrollToIndex({ 
      index, 
      animated: true 
    });
    
    setActiveIndex(index);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      
      <AnimatedFlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        // Keep scroll disabled so users MUST use your custom buttons
        scrollEnabled={false} 
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item, index }: any) => (
          <OnboardingSlide
            item={item}
            index={index}
            // Passing the activeIndex helps the child confirm it is the currently visible slide
            isActive={index === activeIndex} 
            signingIn={signingIn}
            bottomInset={insets.bottom}
            topInset={insets.top}
            onNext={() => goToSlide(index + 1)}
            onBack={() => goToSlide(index - 1)}
            onSkip={() => goToSlide(SLIDES.length - 1)} 
            onGoogleSignIn={signInWithGoogle}
            onFinish={() => { 
              markGuestOnboarded(); 
              router.replace('/(tabs)'); 
            }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: Colors.white 
  },
});