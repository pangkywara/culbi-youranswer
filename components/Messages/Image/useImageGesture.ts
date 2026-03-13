// useImageGesture.ts
import { Gesture } from 'react-native-gesture-handler';
import {
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';

type GestureParams = {
  scale: SharedValue<number>;
  savedScale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  offsetX: SharedValue<number>;
  offsetY: SharedValue<number>;
  bgOpacity: SharedValue<number>;
  onClose: () => void;
};

export const createImageGestures = ({
  scale,
  savedScale,
  translateX,
  translateY,
  offsetX,
  offsetY,
  bgOpacity,
  onClose,
}: GestureParams) => {

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.max(0.6, Math.min(next, 4));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = offsetX.value + e.translationX;
        translateY.value = offsetY.value + e.translationY;
        return;
      }

      translateY.value = e.translationY;

      bgOpacity.value = interpolate(
        Math.abs(e.translationY),
        [0, 200],
        [1, 0.4],
        Extrapolation.CLAMP
      );
    })
    .onEnd((e) => {
      if (scale.value > 1) {
        offsetX.value = translateX.value;
        offsetY.value = translateY.value;
        return;
      }

      if (Math.abs(e.translationY) > 140) {
        const direction = e.translationY > 0 ? 1000 : -1000;

        translateY.value = withTiming(direction, { duration: 200 }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        bgOpacity.value = withTiming(1);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        offsetX.value = 0;
        offsetY.value = 0;
        return;
      }

      const nextScale = 2.5;
      scale.value = withTiming(nextScale);
      savedScale.value = nextScale;

      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
    });

  return Gesture.Simultaneous(
    doubleTap,
    Gesture.Simultaneous(pinch, pan)
  );
};