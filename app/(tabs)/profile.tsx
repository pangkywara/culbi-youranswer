import React, { useRef, useMemo, useState, useCallback } from 'react';
import { Animated, StyleSheet, View, InteractionManager } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors, Space } from '@/constants/style';

import ScreenHeader from '@/components/Profiles/ScreenHeader';
import ProfileHeaderCard from '@/components/Profiles/ProfileHeaderCard';
import ProfileGrid from '@/components/Profiles/ProfileGrid';
import CollectionsCard from '@/components/Profiles/CollectionsCard';
import SettingsList from '@/components/Profiles/SettingsList';
import StickyProfileHeader from '@/components/Profiles/StickyProfileHeader';
import GuestProfileScreen from '@/components/Profiles/GuestProfile';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { isAnonymous, session, loading: authLoading } = useAuth();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Defer heavy child renders until the tab-switch animation has fully settled.
  // Without this, mounting 6 context-subscribing components + Animated.Value
  // setup all happen during the slide animation, freezing the JS thread.
  const [isReady, setIsReady] = useState(false);
  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => setIsReady(true));
      return () => task.cancel();
    }, [])
  );

  // Stable scroll handler — created once, never recreated
  const onScroll = useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  ), [scrollY]);

  // Sticky header opacity — computed once from the same scrollY node
  const headerOpacity = useMemo(() => scrollY.interpolate({
    inputRange: [80, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  }), [scrollY]);

  // While auth is initialising, show a blank white screen so the user never
  // sees a misleading "Log in" button before their session has been checked.
  if (authLoading) {
    return <View style={styles.container} />;
  }

  // No session or anonymous (guest) user → show the guest prompt.
  if (!session || isAnonymous) {
    return <GuestProfileScreen />;
  }

  // Blank screen until the tab-switch animation completes.
  // isReady stays true after first focus — subsequent tab switches are instant.
  if (!isReady) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents="box-none"
        style={[styles.stickyHeader, { opacity: headerOpacity }]}
      >
        <StickyProfileHeader />
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader />
        <ProfileHeaderCard />
        <ProfileGrid />
        <CollectionsCard />
        <SettingsList />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white, marginBottom: 60 },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: Colors.white,
  },
  content: { 
    paddingHorizontal: Space.xl, 
    paddingTop: Space.xl, 
    paddingBottom: 60 // Adjust for bottom navigation
  },
});