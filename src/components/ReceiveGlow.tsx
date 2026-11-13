import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Images } from '@/constants/assets';

// 감정구슬 수신 글로우 (피그마 '상단 Radial Glow', 8초 반복)
// - 화면 위쪽에서 감정 색 빛이 퍼졌다가 은은하게 남음
// - 최초 수신 화면 / 과거 수신 재진입 화면에서만 사용 (기능명세 NT-04~06)
const BASE = 827; // 글로우 이미지 기준 지름 (가장 크게 퍼졌을 때)
const DURATION = 8000;

// [중심 x, 중심 y, 키프레임 시점, 지름들, 투명도들] - 피그마 모션 값을 1/3 로 환산
const LAYERS = [
  {
    cx: 208,
    cy: 58,
    t: [0, 0.3745, 0.8988, 1],
    d: [120, 483, 767, 767],
    o: [0.035, 0.48, 0.11, 0.11],
  },
  {
    cx: 166,
    cy: 75,
    t: [0, 0.4284, 0.8988, 1],
    d: [120, 513, 797, 797],
    o: [0.025, 0.28, 0.065, 0.065],
  },
  {
    cx: 249,
    cy: 75,
    t: [0, 0.4824, 0.8988, 1],
    d: [120, 543, 827, 827],
    o: [0.025, 0.28, 0.065, 0.065],
  },
];

// 키프레임 사이를 ease-in-out 으로 보간
function keyframe(p: number, t: number[], v: number[]) {
  'worklet';
  for (let i = 0; i < t.length - 1; i++) {
    if (p <= t[i + 1]) {
      const local = (p - t[i]) / (t[i + 1] - t[i]);
      const eased = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
      return v[i] + (v[i + 1] - v[i]) * eased;
    }
  }
  return v[v.length - 1];
}

function GlowLayer({
  progress,
  layer,
  color,
}: {
  progress: SharedValue<number>;
  layer: (typeof LAYERS)[number];
  color: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: keyframe(progress.value, layer.t, layer.o),
    transform: [{ scale: keyframe(progress.value, layer.t, layer.d) / BASE }],
  }));

  return (
    <Animated.View
      style={[styles.layer, { left: layer.cx - BASE / 2, top: layer.cy - BASE / 2 }, style]}
    >
      <Image source={Images.glow} style={styles.image} tintColor={color} />
    </Animated.View>
  );
}

export default function ReceiveGlow({ color }: { color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: DURATION, easing: Easing.linear }),
      -1,
      false,
    );
  }, [progress]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {LAYERS.map((layer, i) => (
        <GlowLayer key={i} progress={progress} layer={layer} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', width: BASE, height: BASE },
  image: { width: BASE, height: BASE },
});
