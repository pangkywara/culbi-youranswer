/**
 * useSkeletonShimmer — creates a single Reanimated shared value that drives
 * all SkeletonBox instances on the same screen in perfect phase-lock.
 *
 * Call once per screen and pass the returned value to every SkeletonBox.
 */

import { useEffect } from 'react';
import { Dimensions } from 'react-native';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Travel from -(full screen width) to +(full screen width)
const START_X  = -SCREEN_WIDTH;
const END_X    = SCREEN_WIDTH;
const DURATION = 1200; // ms per full sweep

export function useSkeletonShimmer() {
  const shimmerX = useSharedValue(START_X);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(END_X, { duration: DURATION, easing: Easing.linear }),
      -1, // infinite
      false,
    );
    // Cancel on unmount
    return () => {
      shimmerX.value = START_X;
    };
  }, []);

  return shimmerX;
}
