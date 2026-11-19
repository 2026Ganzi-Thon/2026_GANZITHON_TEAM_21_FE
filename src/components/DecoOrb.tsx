import { Image, type ImageSource } from 'expo-image';
import { StyleSheet } from 'react-native';

type Props = {
  source: ImageSource | number;
  cx: number; // 중심 x (피그마 393pt 기준)
  cy: number; // 중심 y (화면 맨 위 기준)
  size: number;
  rotate?: number; // 도
};

// 커버·로그인 배경에 떠 있는 큰 장식 구슬 (터치 안 됨)
export default function DecoOrb({ source, cx, cy, size, rotate = 0 }: Props) {
  return (
    <Image
      source={source}
      contentFit="cover"
      pointerEvents="none"
      style={[
        styles.orb,
        {
          left: cx - size / 2,
          top: cy - size / 2,
          width: size,
          height: size,
          transform: [{ rotate: `${rotate}deg` }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({ orb: { position: 'absolute' } });
