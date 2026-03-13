import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ShieldCheck, CaretRight } from 'react-native-phosphor';
import { Colors } from '@/constants/style';
import { Mission } from '../missions.types';
import { styles } from '../missions.styles';

interface Props {
  item: Mission;
  onPress: () => void;
}

export const MissionItem = memo(({ item, onPress }: Props) => (
  <TouchableOpacity style={styles.missionItem} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.iconWrapper}>
      <View style={[styles.iconContainer, item.isCompleted && styles.completedIcon]}>
        <item.icon
          size={22}
          color={item.isCompleted ? Colors.white : Colors.textPrimary}
          weight={item.isCompleted ? 'fill' : 'regular'}
        />
      </View>
      {item.isCompleted && (
        <View style={styles.checkBadge}>
          <ShieldCheck size={10} color={Colors.white} weight="fill" />
        </View>
      )}
    </View>

    <View style={styles.contentContainer}>
      <View style={styles.textHeader}>
        <Text style={[styles.itemTitle, item.isCompleted && styles.completedText]} numberOfLines={1}>
          {item.title}
        </Text>
        
        {/* Progress / ongoing indicator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[
            styles.progressText,
            item.isOngoing   && styles.progressTextOngoing,
            item.isCompleted && styles.progressTextCompleted,
          ]}>
            {item.progress}
          </Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={1}>
        {item.description}
      </Text>

      <View style={styles.rewardRow}>
        <Text style={styles.rewardText}>{item.reward}</Text>
        <CaretRight size={12} color={Colors.textTertiary} weight="bold" />
      </View>
    </View>
  </TouchableOpacity>
));