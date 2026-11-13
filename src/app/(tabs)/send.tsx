import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import EmotionOrb from '@/components/EmotionOrb';
import EmotionWheel, { WHEEL_SIZE } from '@/components/EmotionWheel';
import RecipientSheet from '@/components/RecipientSheet';
import { Icons } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { getEmotion, orbImageStyle } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import { mockRecipients } from '@/mocks/send';
import type { EmotionKey, SendRoute } from '@/types/emotion';

const ORB_SIZE = 300;
const ORB_VISIBLE = 272; // 가운데 구슬이 화면에 보이는 지름 (피그마 기준)
const STAGE_HEIGHT = 470;
const CENTER_Y = 224; // 헤더 아래 ~ 휠 중심 (피그마 기준)
const ORB_CENTER_Y = 218; // 가운데 큰 구슬은 휠 중심보다 살짝 위
const MAX_EMOTIONS = 2;

// 단계: 빈 구슬(+) → 휠에서 고르기 → 공유자 선택 시트
type Step = 'empty' | 'pick' | 'share';

// 감정 보내기 (피그마 '감정_보내기' ~ '감정_보내기4')
export default function SendScreen() {
  const { width } = useWindowDimensions();
  const [step, setStep] = useState<Step>('empty');
  const [emotions, setEmotions] = useState<EmotionKey[]>([]);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [route, setRoute] = useState<SendRoute>('nearby');

  const toggleEmotion = (key: EmotionKey) => {
    setEmotions((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      // 최대 2개까지 섞기 - 3번째를 고르면 두 번째를 교체
      if (prev.length >= MAX_EMOTIONS) return [prev[0], key];
      return [...prev, key];
    });
  };

  const toggleRecipient = (id: string) =>
    setRecipientIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // "감정 선택을 마쳤다면 바깥을 터치"
  const onPressOutside = () => {
    if (step === 'pick' && emotions.length > 0) setStep('share');
  };

  const reset = () => {
    setStep('empty');
    setEmotions([]);
    setRecipientIds([]);
    setRoute('nearby');
  };

  const onSend = () => {
    // TODO: 백엔드 연동 - 감정 전송 API
    // { emotions: ['yellow', 'blue'], route: 'nearby' | 'me' | 'anonymous', recipientIds }
    const labels = emotions.map((k) => getEmotion(k).label).join(' · ');
    const done =
      route === 'me'
        ? '나에게 감정을 보관했어요.'
        : route === 'anonymous'
          ? '익명으로 감정을 보냈어요.'
          : `${recipientIds.length}곳에 감정을 보냈어요.`;
    reset();
    Alert.alert('전송 완료', `${done}\n${labels}`);
    router.navigate('/');
  };

  const [first, second] = emotions;
  const firstEmotion = first ? getEmotion(first) : undefined;

  const message =
    step === 'empty'
      ? ['지금 느끼는 감정을 보내보세요.', '+를 눌러 구슬 색상 추가하기.']
      : emotions.length === 0
        ? ['휠을 돌려 감정을 확인 하세요.', '터치 혹은 구슬을 눌러 선택하기.']
        : // 고른 감정의 이름과 단어를 보여줘서 무슨 감정인지 확인할 수 있게
          [
            emotions.map((k) => getEmotion(k).label).join(' + '),
            emotions.length === 1
              ? `${firstEmotion!.words.join(', ')}\n바깥을 터치하면 보내기, 하나 더 고르면 섞기`
              : '바깥을 터치해서 보내기',
          ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onPressOutside} />

      <View style={styles.headerLayer} pointerEvents="box-none">
        <AppHeader title="감정 보내기" />
      </View>

      <View style={styles.stage} pointerEvents="box-none">
        {step === 'pick' && (
          <View
            style={[
              styles.wheel,
              { left: width / 2 - WHEEL_SIZE / 2, top: CENTER_Y - WHEEL_SIZE / 2 },
            ]}
          >
            <EmotionWheel selected={emotions} onToggle={toggleEmotion} />
          </View>
        )}

        <View
          style={[styles.orb, { left: width / 2 - ORB_SIZE / 2, top: ORB_CENTER_Y - ORB_SIZE / 2 }]}
        >
          <EmotionOrb
            size={ORB_SIZE}
            source={firstEmotion?.image}
            overlaySource={second ? getEmotion(second).image : undefined}
            imageStyle={first ? orbImageStyle(first, ORB_VISIBLE) : undefined}
            overlayImageStyle={second ? orbImageStyle(second, ORB_VISIBLE) : undefined}
            ringColor={firstEmotion ? '#1E2633' : '#26282C'}
            glowColor={firstEmotion ? '#8AA8E1' : '#CCD3E0'}
            shadowColor={firstEmotion ? '#1F0F40' : '#34313A'}
            onPress={step === 'empty' ? () => setStep('pick') : onPressOutside}
          >
            {!firstEmotion && (
              <Image source={Icons.plus} style={styles.plus} contentFit="contain" />
            )}
          </EmotionOrb>
        </View>
      </View>

      {step !== 'share' && (
        <View style={styles.texts} pointerEvents="none">
          <Text style={styles.message}>{message[0]}</Text>
          <Text style={styles.hint}>{message[1]}</Text>
        </View>
      )}

      <RecipientSheet
        visible={step === 'share'}
        route={route}
        onChangeRoute={setRoute}
        recipients={mockRecipients}
        selectedIds={recipientIds}
        onToggle={toggleRecipient}
        onBack={() => setStep('pick')}
        onClose={() => setStep('pick')}
        onSend={onSend}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerLayer: { zIndex: 10, backgroundColor: Colors.background },
  stage: { height: STAGE_HEIGHT },
  wheel: { position: 'absolute' },
  orb: { position: 'absolute' },
  plus: { width: 83, height: 83 },
  texts: { alignItems: 'center', marginTop: 8 },
  message: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  hint: {
    marginTop: 3,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
});
