import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'react-native-phosphor';

interface AddStopActionProps {
  onPress: () => void;
  visible: boolean;
  isTimelineExpanded: boolean; // Add this prop
}

export const AddStopAction = ({ onPress, visible, isTimelineExpanded }: AddStopActionProps) => {
  if (!visible) return null;

  return (
    <View style={styles.addStopWrapper}>
      <TouchableOpacity
        style={[
          styles.addStopButton,
          // ─── THE FIX: 1 when NOT expanded, 0 when expanded ───
          { borderTopWidth: !isTimelineExpanded ? 1 : 0 } 
        ]}
        activeOpacity={0.6}
        onPress={onPress}
      >
        <View style={styles.addIconCircle}>
          <Plus size={16} color="#222" weight="bold" />
        </View>
        <View>
          <Text style={styles.addLabel}>Add a stop</Text>
          <Text style={styles.addSub}>Find more landmarks to visit</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  addStopWrapper: {
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  addStopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
    borderTopColor: '#EEE', // The line color
  },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textDecorationLine: 'underline',
  },
  addSub: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
});