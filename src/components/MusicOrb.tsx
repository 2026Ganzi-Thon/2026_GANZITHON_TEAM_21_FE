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
  onTap?: () => void; // 짧게 탭 → 상세 기록 팝업 (PRD 4-5 표)
  children: ReactNode;
};

export default function MusicOrb({
  size,
  enabled,
  playing,
  onPlay,
  onStop,
  onTap,
  children,
}: Props) {
  const rotation = useSharedValue(0);
  const prevAngle = useSharedValue(0);
  const turned = useSharedValue(0); // 이번 제스처에서 돌린 총 각도
  const active = useSharedValue(enabled); // 제스처 안에서도 '음악 있음'을 한 번 더 확인
  useEffect(() => {
    active.set(enabled);
  }, [enabled, active]);
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

  // 음악이 없는 상태(다른 구슬·빈 + 화면)로 바뀌면 돌아간 각도를 원래대로
  // (안 하면 이전 구슬을 돌린 각도 그대로 + 아이콘이 기울어져 보임)
  useEffect(() => {
    if (!enabled) {
      cancelAnimation(rotation);
      rotation.set(0);
    }
  }, [enabled, rotation]);

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
      if (!active.get()) return;
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
      if (!active.get()) return;
      scheduleOnRN(onGestureEnd, turned.value);
    });

  // 짧게 탭: 돌리기(pan)랑 경쟁해서 먼저 인식된 쪽만 동작
  const tap = Gesture.Tap()
    .enabled(!!onTap)
    .runOnJS(true)
    .onEnd((_e, success) => {
      if (success) onTap?.();
    });
  const gesture = Gesture.Race(pan, tap);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }],
  }));

  // 음악이 없는 구슬(빈 + 화면, 휠에서 고르는 중)은 아예 돌릴 수 없게 제스처를 붙이지 않음
  // 폰에서 .enabled(false) 여도 구슬을 끌면 같이 돌아가서, 선택을 풀면 + 가 기울어져 보였음
  if (!enabled && !onTap) {
    return <View style={{ width: size, height: size }}>{children}</View>;
  }

  return (
    // 제스처는 회전하지 않는 바깥 View 에서 받음 (EmotionWheel 과 같은 이유)
    <GestureDetector gesture={gesture}>
      <View style={{ width: size, height: size }} collapsable={false}>
        <Animated.View style={[StyleSheet.absoluteFill, rotateStyle]}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}
