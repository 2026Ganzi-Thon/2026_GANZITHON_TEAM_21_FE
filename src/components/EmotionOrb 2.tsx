import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/colors';

type Props = {
  source: ImageSource;
  size?: number; // 피그마 기준 메인 구슬 = 306
  onPress?: () => void;
};

// 감정 구슬: 어두운 링 + 은은한 글로우 위에 구슬 이미지
// (피그마의 WebGPU 셰이더 효과는 React Native 미지원이라 정적 이미지로 표시)
export default function EmotionOrb({ source, size = 306, onPress }: Props) {
  const ring = size * 0.98;
  const inner = size * 0.927;

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ width: size, height: size }}>
      <View style={[styles.center, StyleSheet.absoluteFill]}>
        <View style={[styles.ring, { width: ring, height: ring, borderRadius: ring / 2 }]}>
          <View style={[styles.inner, { width: inner, height: inner, borderRadius: inner / 2 }]} />
        </View>
      </View>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    // 오른쪽 아래 푸른 그림자 (피그마: rgba(15,17,64,0.86))
    shadowColor: '#0F1140',
    shadowOffset: { width: 17, height: 17 },
    shadowOpacity: 0.86,
    shadowRadius: 27,
    elevation: 20,
  },
  inner: {
    backgroundColor: Colors.surface,
    // 안쪽 핑크빛 테두리 글로우 (피그마: rgba(225,138,205,0.6))
    shadowColor: '#E18ACD',
    shadowOffset: { width: -1, height: -2 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
});
