import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import { mockLatestReceived } from '@/mocks/receive';

const ORB_SIZE = 306;
const ORB_VISIBLE = 282;

// 최초 수신 화면 (피그마 '친구에게_반응', 기능명세 RC-02~05 / MU / NT-04)
// - 반응하기 → 반응 시트, 조용히 듣기 → 반응 없이 확인 (음악 있으면 회전 안내)
export default function ReactionScreen() {
  const { width } = useWindowDimensions();
  const received = mockLatestReceived; // TODO: 수신함 API
  const emotion = getEmotion(received.emotion);
  const hasMusic = !!received.music;

  const [answered, setAnswered] = useState(received.reacted);
  const [sheetOpen, setSheetOpen] = useState(false);
  const music = useOrbMusic(received.music);

  const onSendReaction = (emoji: string) => {
    // TODO: 반응 전송 API (received.id, emoji)
    console.log('[반응]', received.id, emoji);
    setAnswered(true);
  };

  return (
    <View style={styles.root}>
      <ReceiveGlow color={emotion.glow} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title={received.senderName} subtitle={received.sentAtLabel} />

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
              ringColor="#2A2418"
              glowColor="#E1D08A"
              shadowColor="#38400F"
            />
          </MusicOrb>
        </View>

        <Text style={styles.words} numberOfLines={1}>
          {emotion.words.join(', ')}…
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
    maxWidth: 160,
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  buttons: { position: 'absolute', top: 498 + 47, left: 37, right: 37, gap: 13 },
  music: { position: 'absolute', top: 492 + 47, left: 0, right: 0, alignItems: 'center' },
  headphones: { width: 22, height: 22 },
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
