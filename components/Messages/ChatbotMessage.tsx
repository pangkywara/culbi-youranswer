import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { MapPin, Sparkle } from 'react-native-phosphor';
import { Colors, Type, Space, Radius } from '@/constants/style';
import { MessageBubble } from './Bubbles/MessageBubblesBot';
import { LocationBubble } from './Bubbles/LocationBubble';
import { TripPlanBubble } from './Bubbles/TripPlanBubble';

interface ChatMessageProps {
  id?: string;
  text?: string;
  imageUri?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  itinerary?: import('@/hooks/useGeminiChat').TripItinerary;
  isUser: boolean;
  time?: string;
  senderName?: string;
  readBy?: string;
  isEditable?: boolean;
  replyTo?: { text?: string; imageUri?: string; isUser: boolean };
  onImagePress: (uri: string) => void;
  onReply: (target: any) => void;
  onEdit?: () => void;
  onCopy?: () => void;
  /** When true, renders the "Plan a Trip" quick-action chip below the bubble */
  showPlanButton?: boolean;
  onPlanTrip?: () => void;
  /** When editing an existing trip, pass the trip ID to show 'Apply Changes' */
  existingTripId?: string;
}

export const ChatMessage = (props: ChatMessageProps) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, []);

  // Trip plan bubble — shows the Culbi sender header + the plan card
  if (props.itinerary) {
    return (
      <Animated.View style={[styles.wrapper, styles.otherWrapper, { opacity }]}>
        {props.senderName && (
          <Text style={styles.senderHeader}>
            {props.senderName} • {props.time}
          </Text>
        )}
        <TripPlanBubble 
          itinerary={props.itinerary} 
          isUser={props.isUser}
          existingTripId={props.existingTripId}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[
      styles.wrapper, 
      props.isUser ? styles.userWrapper : styles.otherWrapper,
      { opacity }
    ]}>
      {!props.isUser && props.senderName && (
        <Text style={styles.senderHeader}>
          {props.senderName} • Host {props.time}
        </Text>
      )}
      
      {/* Render the main message bubble whenever there is text or an image. */}
      {(props.text || props.imageUri) && (
        <MessageBubble {...props} isEditable={props.isEditable} onEdit={props.onEdit} onCopy={props.onCopy} />
      )}
      {props.location && (
        <LocationBubble
          latitude={props.location.latitude}
          longitude={props.location.longitude}
          address={props.location.address}
          isUser={props.isUser}
          onPress={() => {
            console.log('Location Pressed', props.location);
          }}
        />
      )}
      {!props.text && !props.imageUri && !props.location && <MessageBubble {...props} />}

      {props.isUser && props.readBy && (
        <Text style={styles.readBy}>Read by {props.readBy}</Text>
      )}

      {/* ── Plan a Trip quick-action — only on the welcome bubble ─── */}
      {props.showPlanButton && props.onPlanTrip && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.planBtn}
            onPress={props.onPlanTrip}
            activeOpacity={0.82}
          >
            <Sparkle size={13} color={Colors.textPrimary} weight="fill" />
            <Text style={styles.planBtnText}>Plan a trip with Culbi</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginVertical: 20, paddingHorizontal: 16 },
  userWrapper: { alignItems: 'flex-end' },
  otherWrapper: { alignItems: 'flex-start' },
  senderHeader: { 
    fontSize: 13, 
    color: '#717171', 
    marginBottom: 4, 
    fontWeight: '600' 
  },
  readBy: { fontSize: 11, color: '#717171', marginTop: 4 },
  quickActions: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  planBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs + 2,
    paddingHorizontal: Space.lg - 2,
    paddingVertical: Space.sm + 1,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.dark,
    backgroundColor: Colors.white,
  },
  planBtnText: {
    fontSize: Type.sizeCaption,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
});