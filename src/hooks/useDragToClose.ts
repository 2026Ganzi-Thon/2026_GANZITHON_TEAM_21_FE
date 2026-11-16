import { useEffect } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// 하단 시트 손잡이를 아래로 끌어서 닫기 (상세 기록 시트와 같은 감도)
const DISMISS_RATIO = 0.25; // 시트 높이의 25% 이상 내리면 닫힘
const DISMISS_VELOCITY = 700; // 또는 이 속도(px/s) 이상으로 휙 내리면 닫힘
const SPRING_BACK = { damping: 24, stiffness: 280, mass: 0.9 }; // 덜 내렸으면 제자리로

// 사용법: const { drag, sheetStyle, onLayout } = useDragToClose(visible, onClose)
//  <GestureDetector gesture={drag}><View>손잡이</View></GestureDetector>
//  <Animated.View style={[styles.sheet, sheetStyle]} onLayout={onLayout}>
export function useDragToClose(visible: boolean, onClose: () => void) {
  const offset = useSharedValue(0);
  const height = useSharedValue(400);

  // 다시 열릴 때 제자리에서 시작
  useEffect(() => {
    if (visible) offset.set(0);
  }, [visible, offset]);

  const drag = Gesture.Pan()
    .onUpdate((e) => {
      offset.set(Math.max(0, e.translationY)); // 위로는 안 끌림
    })
    .onEnd((e) => {
      const far = offset.get() > height.get() * DISMISS_RATIO;
      const fast = e.velocityY > DISMISS_VELOCITY;
      if (far || fast) {
        offset.set(
          withTiming(height.get(), { duration: 200, easing: Easing.out(Easing.quad) }, (done) => {
            if (done) scheduleOnRN(onClose);
          }),
        );
      } else {
        offset.set(withSpring(0, { ...SPRING_BACK, velocity: e.velocityY }));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));
  const onLayout = (e: { nativeEvent: { layout: { height: number } } }) =>
    height.set(e.nativeEvent.layout.height);

  return { drag, sheetStyle, onLayout };
}
