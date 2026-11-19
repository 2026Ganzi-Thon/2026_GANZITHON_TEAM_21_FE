import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DecoOrb from '@/components/DecoOrb';
import { Images } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

type Props = { onDone: () => void };

const DURATION = 1800;

// 앱 켤 때 잠깐 보이는 첫 화면 (피그마 '커버'). 누르면 바로 넘어감
export default function Cover({ onDone }: Props) {
  // 피그마 좌표는 상태바(46pt) 포함 → 실제 기기 상태바 높이만큼 보정
  const dy = useSafeAreaInsets().top - 46;

  useEffect(() => {
    const t = setTimeout(onDone, DURATION);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <Animated.View exiting={FadeOut.duration(350)} style={styles.wrap}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDone}>
        <DecoOrb source={Images.decoGray} cx={375.7} cy={249 + dy} size={325} rotate={145.5} />
        <DecoOrb source={Images.decoGreen} cx={58.6} cy={360 + dy} size={282} rotate={-67.95} />
        <DecoOrb source={Images.decoPink} cx={407.7} cy={648 + dy} size={508} rotate={45.69} />
        <DecoOrb source={Images.decoPurple} cx={202} cy={580 + dy} size={189} />
        <Image source={Images.logo} style={[styles.logo, { top: 70 + dy }]} contentFit="contain" />
        <Text style={[styles.welcome, { top: 160 + dy }]}>이모리에 오신 것을 환영합니다</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, backgroundColor: Colors.background, zIndex: 100 },
  logo: { position: 'absolute', left: 27, width: 184, height: 97 },
  welcome: {
    position: 'absolute',
    left: 31.3,
    fontFamily: Fonts.semiBold,
    fontSize: 16.7,
    lineHeight: 22,
    color: Colors.textActive,
  },
});
