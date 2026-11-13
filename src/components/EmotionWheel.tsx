import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
} from 'react-native-reanimated';

import { Icons } from '@/constants/assets';
import { EMOTIONS, orbImageStyle } from '@/constants/emotions';
import type { EmotionKey } from '@/types/emotion';

// 감정 구슬 휠 (피그마 '감정_보내기1')
// - 드래그로 휠을 돌리고(손을 떼면 관성으로 조금 더 돎), 구슬을 탭하면 선택
export const WHEEL_SIZE = 527; // 휠 트랙 지름
const SLOT = 105; // 구슬 자리(검은 원) 크기
const ORB_VISIBLE = 86; // 화면에 보이는 구슬 지름 (피그마 기준)

// 구슬 위치 (피그마 '감정_보내기2' 화면을 픽셀 분석해서 잰 값)
// 7개가 반지름 201 원 위에 33.1° 간격으로 놓임, 0° = 오른쪽 / 90° = 아래
const RADIUS = 201;
const STEP = 33.1;
const START = -9.3; // 첫 구슬(초록) 각도 → 4번째(분홍)가 정확히 아래(90°)

type Props = {
  selected: EmotionKey[];
  onToggle: (key: EmotionKey) => void;
};

export default function EmotionWheel({ selected, onToggle }: Props) {
  const rotation = useSharedValue(0);
  const prevAngle = useSharedValue(0);
  const c = WHEEL_SIZE / 2;

  const pan = Gesture.Pan()
    .minDistance(2)
    .onBegin(() => {
      // 관성으로 돌던 중이면 멈추기
      cancelAnimation(rotation);
    })
    .onStart((e) => {
      prevAngle.value = Math.atan2(e.y - c, e.x - c);
    })
    .onUpdate((e) => {
      // 손가락 위치의 각도 변화만큼 회전
      const a = Math.atan2(e.y - c, e.x - c);
      let d = a - prevAngle.value;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      rotation.value += (d * 180) / Math.PI;
      prevAngle.value = a;
    })
    .onEnd((e) => {
      // 손을 뗀 속도(접선 방향)를 각속도로 바꿔서 관성 회전
      const x = e.x - c;
      const y = e.y - c;
      const r2 = Math.max(x * x + y * y, 2500);
      const omega = ((x * e.velocityY - y * e.velocityX) / r2) * (180 / Math.PI);
      rotation.value = withDecay({ velocity: omega, deceleration: 0.994 });
    });

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    // 제스처는 '회전하지 않는' 바깥 View 에서 받아야 함
    // (돌아가는 View 에서 받으면 손가락 좌표도 같이 돌아서 방향이 뒤집히고 덜컥거림)
    <GestureDetector gesture={pan}>
      <View style={styles.wheel} collapsable={false}>
        <Animated.View
          style={[StyleSheet.absoluteFill, rotateStyle]}
          // 회전하는 동안 매 프레임 다시 그리지 않도록 비트맵으로 캐시
          shouldRasterizeIOS
          renderToHardwareTextureAndroid
        >
          <Image source={Icons.wheelTrack} style={StyleSheet.absoluteFill} contentFit="contain" />
          {EMOTIONS.map((emotion, i) => {
            const rad = ((START + i * STEP) * Math.PI) / 180;
            const isSelected = selected.includes(emotion.key);
            return (
              <Pressable
                key={emotion.key}
                onPress={() => onToggle(emotion.key)}
                accessibilityRole="button"
                accessibilityLabel={emotion.label}
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.slot,
                  {
                    left: c + RADIUS * Math.cos(rad) - SLOT / 2,
                    top: c + RADIUS * Math.sin(rad) - SLOT / 2,
                  },
                  isSelected && styles.slotSelected,
                ]}
              >
                <Image
                  source={emotion.image}
                  style={orbImageStyle(emotion.key, ORB_VISIBLE)}
                  contentFit="contain"
                />
              </Pressable>
            );
          })}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wheel: { width: WHEEL_SIZE, height: WHEEL_SIZE },
  slot: {
    position: 'absolute',
    width: SLOT,
    height: SLOT,
    borderRadius: SLOT / 2,
    backgroundColor: '#0B0B0B',
    borderWidth: 0.5,
    borderColor: '#000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 선택된 구슬은 흐리게 (중앙으로 옮겨졌다는 느낌)
  slotSelected: { opacity: 0.35 },
});
