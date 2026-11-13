import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, NeuCard } from '@/constants/colors';
import { getEmotion, orbImageStyle } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import type { EmotionKey } from '@/types/emotion';

const ORB = 44;

type Props = {
  name: string;
  emotion: EmotionKey;
  children?: ReactNode; // 오른쪽 버튼들 (absolute 로 직접 배치)
  // 피그마: 줄이 화면 양옆 밖까지 나가 있음 (화면마다 -20 / -25)
  bleed?: number;
  // 화면 왼쪽 기준 구슬 중심 / 이름 시작 x
  orbCenterX?: number;
  nameX?: number;
};

// 사람 한 줄 (소셜 목록 / 친구 요청 / 검색 결과 공용)
export default function PersonRow({
  name,
  emotion,
  children,
  bleed = 20,
  orbCenterX = 63,
  nameX = 105,
}: Props) {
  const e = getEmotion(emotion);
  return (
    <View style={[styles.row, { marginHorizontal: -bleed }]}>
      <View style={[styles.orb, { left: bleed + orbCenterX - ORB / 2 }]}>
        <Image source={e.image} style={orbImageStyle(e.key, ORB)} contentFit="contain" />
      </View>
      <Text style={[styles.name, { left: bleed + nameX }]} numberOfLines={1}>
        {name}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    ...NeuCard,
    height: 64,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orb: {
    position: 'absolute',
    width: ORB,
    height: ORB,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    position: 'absolute',
    right: 140,
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.white,
  },
});
