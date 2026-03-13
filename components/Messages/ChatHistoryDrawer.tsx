import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, ClockCounterClockwise } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.65;

export const ChatHistoryDrawer = ({
  visible,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onClose,
}: any) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(PANEL_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [isMounted, setIsMounted] = useState(false);

  const springConfig = {
    damping: 20,
    stiffness: 150,
    mass: 0.8,
  };

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      backdropOpacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, springConfig);
    } else {
      backdropOpacity.value = withTiming(0, { duration: 250 });
      translateY.value = withSpring(PANEL_HEIGHT, springConfig, (finished) => {
        if (finished) runOnJS(setIsMounted)(false);
      });
    }
  }, [visible]);

  // Pan gesture to drag the drawer down
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 500) {
        translateY.value = withSpring(PANEL_HEIGHT, { ...springConfig, velocity: e.velocityY }, () => runOnJS(onClose)());
      } else {
        translateY.value = withSpring(0, springConfig);
      }
    });

  const animatedSheet = useAnimatedStyle(() => ({ 
    transform: [{ translateY: translateY.value }] 
  }));
  
  const animatedBackdrop = useAnimatedStyle(() => ({ 
    opacity: backdropOpacity.value 
  }));

  if (!isMounted) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <GestureHandlerRootView style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        
        {/* Backdrop: Moved inside GestureHandlerRootView for touch reliability */}
        <Animated.View 
          style={[styles.backdrop, animatedBackdrop]} 
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable 
            style={StyleSheet.absoluteFillObject} 
            onPress={onClose} 
            accessibilityLabel="Close drawer"
          />
        </Animated.View>

        <Animated.View style={[styles.sheet, animatedSheet, { paddingBottom: insets.bottom }]}>
          <GestureDetector gesture={panGesture}>
            <View style={styles.dragZone}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <ClockCounterClockwise size={22} color={Colors.textPrimary} weight="bold" />
                  <Text style={styles.title}>History</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={15}>
                   <X size={18} color={Colors.textPrimary} weight="bold" />
                </TouchableOpacity>
              </View>
            </View>
          </GestureDetector>

          <TouchableOpacity
            style={styles.newChatBtn}
            activeOpacity={0.9}
            onPress={() => { onNewSession(); onClose(); }}
          >
            <Plus size={18} color="#FFF" weight="bold" />
            <Text style={styles.newChatText}>New Chat</Text>
          </TouchableOpacity>

          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isActive = item.id === currentSessionId;
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.sessionCard, isActive && styles.activeCard]}
                  onPress={() => { onSelectSession(item.id); onClose(); }}
                >
                  <View style={styles.sessionMain}>
                    <Text style={[styles.sessionTitle, isActive && styles.activeText]} numberOfLines={1}>
                      {item.title || "Untitled Conversation"}
                    </Text>
                    <Text style={styles.sessionSnippet} numberOfLines={1}>
                      {item.lastMessage || "No messages yet"}
                    </Text>
                  </View>
                  <View style={styles.sessionRight}>
                     <Text style={styles.sessionTime}>{formatSessionTime(item.updatedAt)}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </Animated.View>
      </GestureHandlerRootView>
    </View>
  );
};

/* ─── Formatting Helper ─── */
function formatSessionTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30,
    overflow: 'hidden',
    ...Shadows.level5,
  },
  dragZone: { paddingTop: 14, paddingBottom: 8 },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: Radius.full,
    backgroundColor: '#EBEBEB',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: {
    backgroundColor: Colors.surfaceMuted,
    padding: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.brand,
    marginHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 20,
    ...Shadows.level5,
  },
  newChatText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeCard: {
    backgroundColor: Colors.white,
    borderColor: Colors.brand,
    borderWidth: 1.5,
    ...Shadows.level2,
  },
  sessionMain: { flex: 1, marginRight: 12 },
  sessionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: Colors.textPrimary, 
    marginBottom: 4 
  },
  activeText: { color: Colors.textPrimary },
  sessionSnippet: { 
    fontSize: 14, 
    color: Colors.textSecondary,
    fontWeight: '400' 
  },
  sessionRight: { alignItems: 'flex-end' },
  sessionTime: { 
    fontSize: 12, 
    color: Colors.textSecondary, 
    fontWeight: '500' 
  },
});