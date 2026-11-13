import { Image, type ImageSource, type ImageStyle } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp } from 'react-native';

import { Colors } from '@/constants/colors';

type Props = {
  source?: ImageSource | number; // 없으면 빈 구슬 (children 으로 + 아이콘 등 표시)
  overlaySource?: ImageSource | number; // 두 번째 감정 (섞기) - 반투명으로 겹침
  size?: number; // 피그마 기준 메인 구슬 = 306
  ringColor?: string; // 링 안쪽 색
  glowColor?: string; // 링 테두리 글로우 색
  shadowColor?: string; // 오른쪽 아래 그림자 색
  onPress?: () => void;
  children?: ReactNode;
  // 구슬 이미지 크기·위치를 직접 지정 (감정 구슬 크기 보정용, 없으면 꽉 채움)
  imageStyle?: StyleProp<ImageStyle>;
  overlayImageStyle?: StyleProp<ImageStyle>;
};

// 감정 구슬: 어두운 링 + 은은한 글로우 위에 구슬 이미지
// (피그마의 WebGPU 셰이더 효과는 React Native 미지원이라 정적 이미지로 표시)
export default function EmotionOrb({
  source,
  overlaySource,
  size = 306,
  ringColor = '#241C2A',
  glowColor = '#E18ACD',
  shadowColor = '#0F1140',
  onPress,
  children,
  imageStyle,
  overlayImageStyle,
}: Props) {
  const ring = size * 0.98;
  const inner = size * 0.927;

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ width: size, height: size }}>
      <View style={[styles.center, StyleSheet.absoluteFill]}>
        <View
          style={[styles.ring, { width: ring, height: ring, borderRadius: ring / 2, shadowColor }]}
        >
          <View
            style={[
              styles.inner,
              {
                width: inner,
                height: inner,
                borderRadius: inner / 2,
                backgroundColor: ringColor,
                shadowColor: glowColor,
              },
            ]}
          />
        </View>
      </View>
      {source && (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Image
            source={source}
            style={imageStyle ?? [StyleSheet.absoluteFill, styles.image]}
            contentFit="contain"
          />
        </View>
      )}
      {overlaySource && (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Image
            source={overlaySource}
            style={[overlayImageStyle ?? [StyleSheet.absoluteFill, styles.image], styles.overlay]}
            contentFit="contain"
          />
        </View>
      )}
      {children && <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 17, height: 17 },
    shadowOpacity: 0.86,
    shadowRadius: 27,
    elevation: 20,
  },
  // 이미지 자체 여백 때문에 링 안을 꽉 채우도록 살짝 키움
  image: { transform: [{ scale: 1.08 }] },
  overlay: { opacity: 0.55 },
  inner: {
    shadowOffset: { width: -1, height: -2 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
});
