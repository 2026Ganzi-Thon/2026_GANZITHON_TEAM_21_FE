import { useCallback, useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// 음악 구슬 회전 인터랙션 (기능명세 MU-03 / MU-04)
// - 시계 방향 90° 이상 돌리면 재생 → LP 처럼 계속 회전
// - 시계 반대 방향 60° 이상 돌리면 정지
const PLAY_DEG = 90;
const STOP_DEG = -60;
const SPIN_MS = 4000; // 재생 중 한 바퀴 도는 시간

type Props = {
  size: number;
  enabled: boolean; // 음악 첨부된 구슬만 true
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
  children: ReactNode;
};

export default function MusicOrb({ size, enabled, playing, onPlay, onStop, children }: Props) {
  const rotation = useSharedValue(0);
  const prevAngle = useSharedValue(0);
  const turned = useSharedValue(0); // 이번 제스처에서 돌린 총 각도
  const c = size / 2;

  const startSpin = useCallback(() => {
    // Reanimated 4: .get()/.set() 사용 (React Compiler 규칙 때문)
    rotation.set(
      withRepeat(
        withTiming(rotation.get() + 360, { duration: SPIN_MS, easing: Easing.linear }),
        -1,
        false,
      ),
    );
  }, [rotation]);

  useEffect(() => {
    if (playing) startSpin();
    else cancelAnimation(rotation);
  }, [playing, startSpin, rotation]);

  const onGestureEnd = (deg: number) => {
    if (deg >= PLAY_DEG) onPlay();
    else if (deg <= STOP_DEG) onStop();
    else if (playing) startSpin(); // 애매하게 돌렸으면 원래 상태로
  };

  const pan = Gesture.Pan()
    .enabled(enabled)
    .minDistance(2)
    .onStart((e) => {
      cancelAnimation(rotation);
      prevAngle.value = Math.atan2(e.y - c, e.x - c);
      turned.value = 0;
    })
    .onUpdate((e) => {
      const a = Math.atan2(e.y - c, e.x - c);
      let d = a - prevAngle.value;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      const deg = (d * 180) / Math.PI; // + 가 시계 방향
      rotation.set(rotation.get() + deg);
      turned.value += deg;
      prevAngle.value = a;
    })
    .onEnd(() => {
      scheduleOnRN(onGestureEnd, turned.value);
    });

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }],
  }));

  return (
    // 제스처는 회전하지 않는 바깥 View 에서 받음 (EmotionWheel 과 같은 이유)
    <GestureDetector gesture={pan}>
      <View style={{ width: size, height: size }} collapsable={false}>
        <Animated.View style={[StyleSheet.absoluteFill, rotateStyle]}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}
