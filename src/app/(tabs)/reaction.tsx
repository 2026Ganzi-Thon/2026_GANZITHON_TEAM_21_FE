import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import EmotionOrb from '@/components/EmotionOrb';
import MusicOrb from '@/components/MusicOrb';
import NeuButton from '@/components/NeuButton';
import ReactionSheet from '@/components/ReactionSheet';
import ReceiveGlow from '@/components/ReceiveGlow';
import { Icons } from '@/constants/assets';
import { Colors } from '@/constants/colors';
import { getEmotion, orbImageStyle } from '@/constants/emotions';
import { Fonts } from '@/constants/typography';
import { useOrbMusic } from '@/hooks/useOrbMusic';
import { findReceived, mockLatestReceived } from '@/mocks/receive';
import type { ReceivedEmotion } from '@/types/emotion';
import { confirm, notify } from '@/utils/dialog';

const ORB_SIZE = 306;
const ORB_VISIBLE = 282;

// 단일 감정구슬 화면 (피그마 '친구에게_반응', PRD v1.4 4-3 / 4-4 / 4-7)
// - 최초 수신: 글로우 + (익명으로 받았으면) 반응하기 / 조용히 듣기 / 신고
//             친구(가까운 사람)에게 받은 구슬은 반응 기능 없음
// - 과거 기록 재진입 (?replay=1): 글로우 다시 보여주고 음악만 다시 듣기. 버튼 없음, 새 수신으로 처리 X
export default function ReactionScreen() {
  const { id, replay } = useLocalSearchParams<{ id?: string; replay?: string }>();
  const received = findReceived(id) ?? mockLatestReceived; // TODO: 수신함 API
  const isReplay = replay === '1';
  // key 로 구슬이 바뀔 때마다 화면 상태·글로우를 새로 시작
  return (
    <ReceivedView key={`${received.id}-${isReplay}`} received={received} isReplay={isReplay} />
  );
}

function ReceivedView({ received, isReplay }: { received: ReceivedEmotion; isReplay: boolean }) {
  const { width } = useWindowDimensions();
  const [first, second] = received.emotions;
  const emotion = getEmotion(first);
  const hasMusic = !!received.music;
  const isAnonymous = received.route === 'anonymous';
  // 반응 기능은 익명으로 받은 구슬의 최초 수신 화면에서만
  const canReact = isAnonymous && !isReplay;
  // 섞은 구슬은 두 감정 이름, 하나면 감정 단어
  const words = second
    ? received.emotions.map((k) => getEmotion(k).label).join(' + ')
    : `${emotion.words.join(', ')}…`;

  const [answered, setAnswered] = useState(received.reacted || !canReact);
  const [sheetOpen, setSheetOpen] = useState(false);
  const music = useOrbMusic(received.music);

  const onSendReaction = (emoji: string) => {
    // TODO: 반응 전송 API (received.id, emoji)
    console.log('[반응]', received.id, emoji);
    setAnswered(true);
  };

  const report = () =>
    confirm({
      title: '이 감정구슬을 신고할까요?',
      message: '부적절한 내용이 있다면 알려주세요. 보낸 사람에게는 알리지 않아요.',
      okText: '신고',
      destructive: true,
      onOk: () => {
        // TODO: 익명 구슬 신고 API (received.id)
        notify('신고가 접수됐어요.');
      },
    });

  return (
    <View style={styles.root}>
      <ReceiveGlow color={emotion.glow} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          title={received.senderName}
          subtitle={isReplay ? `${received.sentAtLabel} · 지난 기록` : received.sentAtLabel}
        />

        <View style={[styles.orb, { left: width / 2 - ORB_SIZE / 2 }]}>
          <MusicOrb
            size={ORB_SIZE}
            enabled={hasMusic}
            playing={music.playing}
            onPlay={music.play}
            onStop={music.stop}
          >
            <EmotionOrb
              size={ORB_SIZE}
              source={emotion.image}
              imageStyle={orbImageStyle(emotion.key, ORB_VISIBLE)}
              overlaySource={second ? getEmotion(second).image : undefined}
              overlayImageStyle={second ? orbImageStyle(second, ORB_VISIBLE) : undefined}
              ringColor="#2A2418"
              glowColor="#E1D08A"
              shadowColor="#38400F"
            />
          </MusicOrb>
        </View>

        <Text style={styles.words} numberOfLines={1}>
          {words}
        </Text>

        {!answered ? (
          <View style={styles.buttons}>
            <NeuButton label="반응하기" variant="accent" onPress={() => setSheetOpen(true)} />
            <NeuButton label="조용히 듣기" variant="dark" onPress={() => setAnswered(true)} />
          </View>
        ) : hasMusic ? (
          <View style={styles.music}>
            <Image source={Icons.headphones} style={styles.headphones} contentFit="contain" />
            <Text style={styles.musicTitle}>
              {music.playing ? '음악을 듣고 있어요.' : '감정과 관련 된 음악이 있어요.'}
            </Text>
            <Text style={styles.musicSub}>
              {music.playing
                ? '반대 방향으로 스와이프하면 멈춰요.'
                : '시계 방향으로 구슬을 스와이프.'}
            </Text>
          </View>
        ) : null}

        {canReact && (
          <Pressable onPress={report} hitSlop={10} style={styles.report} accessibilityRole="button">
            <Text style={styles.reportText}>신고하기</Text>
          </Pressable>
        )}
      </SafeAreaView>

      <ReactionSheet
        visible={sheetOpen}
        onSend={onSendReaction}
        onClose={() => setSheetOpen(false)}
        onGoMain={() => {
          setSheetOpen(false);
          router.navigate('/');
        }}
      />
    </View>
  );
}

// 위치는 피그마 기준 (상태바 아래부터 잰 값)
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  orb: { position: 'absolute', top: 117 + 47 },
  words: {
    position: 'absolute',
    top: 455 + 47,
    alignSelf: 'center',
    maxWidth: 260,
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  buttons: { position: 'absolute', top: 498 + 47, left: 37, right: 37, gap: 13 },
  music: { position: 'absolute', top: 492 + 47, left: 0, right: 0, alignItems: 'center' },
  headphones: { width: 22, height: 22 },
  // 탭바와 안 겹치게 구슬 오른쪽 위에
  report: { position: 'absolute', top: 92 + 47, right: 24 },
  reportText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  musicTitle: {
    marginTop: 12,
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  musicSub: {
    marginTop: 4,
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
});
